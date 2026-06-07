import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CreditCard, Plus, Search, FileText, Calendar, User, BookOpen, Filter, X, 
  HelpCircle, Trash2, Edit2, ChevronDown, CheckCircle, BarChart2, CheckCircle2,
  ArrowLeft, Download, AlertCircle, Sparkles, AlertTriangle, Printer, Coins,
  Clock, ShieldAlert, ListFilter, FileSpreadsheet, RefreshCw, Layers, Check, UserCheck, Database
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, 
  query, where, orderBy, writeBatch, serverTimestamp, getDocs, setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../firebase';
import { Student, Section, UserProfile, PTAFee, PTAPayment, PTAAuditLog } from '../types';
import { formatStudentName, printHTMLContent } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface PTAFeesManagementViewProps {
  currentUser: any;
  userProfile: UserProfile | null;
  selectedSection: Section | null;
  sections: Section[];
  initialTab?: 'collection' | 'setup' | 'reports' | 'audit';
}

export function PTAFeesManagementView({
  currentUser,
  userProfile,
  selectedSection: initialSelectedSection,
  sections,
  initialTab = 'collection'
}: PTAFeesManagementViewProps) {
  // Navigation tabs within PTA module
  const [ptaTab, setPtaTab] = useState<'collection' | 'setup' | 'reports' | 'audit' | 'all-payments' | 'summary'>(initialTab === 'collection' ? 'reports' : initialTab);

  // App-wide collections
  const [fees, setFees] = useState<PTAFee[]>([]);
  const [payments, setPayments] = useState<PTAPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<PTAAuditLog[]>([]);
  const [cashierEmails, setCashierEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and search variables
  const [selectedSectionId, setSelectedSectionId] = useState<string>(initialSelectedSection?.id || 'all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [stdSearchQuery, setStdSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Currently loaded students for the collection list
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    if (initialSelectedSection) {
      setSelectedSectionId(initialSelectedSection.id);
    } else {
      setSelectedSectionId('all');
    }
  }, [initialSelectedSection]);

  // Modals & Panels
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<PTAFee | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ student: Student; fee: PTAFee } | null>(null);
  const [showReceipt, setShowReceipt] = useState<PTAPayment | null>(null);
  const [cashierToRemove, setCashierToRemove] = useState<string | null>(null);
  
  // Custom Fee Deletion confirmation states
  const [deleteConfirmFee, setDeleteConfirmFee] = useState<PTAFee | 'all' | null>(null);
  const [typedConfirmText, setTypedConfirmText] = useState('');
  const [showClearAuditConfirm, setShowClearAuditConfirm] = useState(false);
  const [showClearAllPaymentsConfirm, setShowClearAllPaymentsConfirm] = useState(false);

  // Form states - Fee Template
  const [feeFormName, setFeeFormName] = useState('');
  const [feeFormAmount, setFeeFormAmount] = useState<number>(0);
  const [feeFormDescription, setFeeFormDescription] = useState('');
  const [feeFormYear, setFeeFormYear] = useState('');
  const [feeFormSemester, setFeeFormSemester] = useState<'1st Semester' | '2nd Semester' | 'Full Year'>('Full Year');
  const [feeFormStatus, setFeeFormStatus] = useState<'active' | 'inactive'>('active');
  
  // Form states - Payment Record
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payOrNumber, setPayOrNumber] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payCollector, setPayCollector] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // Form states - Cashiers Config
  const [newCashierEmail, setNewCashierEmail] = useState('');

  // Auto-deduced active school year from global or section records
  const activeSchoolYear = useMemo(() => {
    if (initialSelectedSection?.schoolYear) return initialSelectedSection.schoolYear;
    if (sections.length > 0) return sections[0].schoolYear;
    return '2025-2026';
  }, [initialSelectedSection, sections]);

  useEffect(() => {
    if (feeFormYear === '') {
      setFeeFormYear(activeSchoolYear);
    }
  }, [activeSchoolYear, feeFormYear]);

  // Set default collector to logged in user displayName or email
  useEffect(() => {
    if (userProfile) {
      setPayCollector(userProfile.displayName || userProfile.email.split('@')[0].toUpperCase());
    }
  }, [userProfile]);

  // Roles verification
  const isSystemAdmin = userProfile?.role === 'system_admin';
  const isAdmin = userProfile?.role === 'admin';
  const isSuperAdmin = isSystemAdmin || isAdmin;
  
  // Is current teacher authorized as Cashier?
  const isAuthorizedCashier = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!userProfile) return false;
    return cashierEmails.map(e => e.toLowerCase()).includes(userProfile.email.toLowerCase());
  }, [isSuperAdmin, userProfile, cashierEmails]);

  const activeSection = useMemo(() => {
    return sections.find(s => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  // Is current user the adviser of the selected section?
  const isAdviserOfSelectedSection = useMemo(() => {
    if (!activeSection || !userProfile) return false;
    return activeSection.adviserEmail?.toLowerCase() === userProfile.email.toLowerCase();
  }, [activeSection, userProfile]);

  useEffect(() => {
    if (isAdviserOfSelectedSection) {
      setPtaTab(initialTab);
    } else {
      setPtaTab('reports');
    }
  }, [initialTab, isAdviserOfSelectedSection]);

  // Can collect payment? (Has Cashier or is Adviser of selected section)
  const canCollectPayments = isAuthorizedCashier || isAdviserOfSelectedSection;

  // 1. Fetch PTA configurations, fees list, payments list, audit logs
  useEffect(() => {
    if (!userProfile) return;
    const schoolId = userProfile.schoolId || 'default_school';
    
    setLoading(true);

    // Dynamic listener for PTA setup templates
    const feesRef = collection(db, 'pta_fees');
    const feesQuery = query(feesRef, where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'));
    const unsubFees = onSnapshot(feesQuery, (snap) => {
      setFees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PTAFee));
    }, (err) => {
      console.error("Error loading PTA fees:", err);
    });

    // Dynamic listener for Payment Records
    const paymentsRef = collection(db, 'pta_payments');
    const paymentsQuery = query(paymentsRef, where('schoolId', '==', schoolId), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
      setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PTAPayment));
      setLoading(false);
    }, (err) => {
      console.error("Error loading payments list:", err);
      setLoading(false);
    });

    // Dynamic listener for Audit Trail
    const auditRef = collection(db, 'pta_audit_logs');
    const auditQuery = query(auditRef, where('schoolId', '==', schoolId), orderBy('timestamp', 'desc'));
    const unsubAudit = onSnapshot(auditQuery, (snap) => {
      setAuditLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as PTAAuditLog));
    }, (err) => {
      console.error("Error loading audit logs:", err);
    });

    // Listen to Cashiers collection (or a document under settings for PTA config)
    const ptaConfigQuery = query(collection(db, 'settings'), where('id', '==', `pta_config_${schoolId}`));
    const unsubConfig = onSnapshot(ptaConfigQuery, (snap) => {
      if (!snap.empty) {
        const configData = snap.docs[0].data();
        setCashierEmails(configData.cashierEmails || []);
      } else {
        setCashierEmails([]);
      }
    }, (err) => {
      console.error("Error load cashiers settings:", err);
    });

    return () => {
      unsubFees();
      unsubPayments();
      unsubAudit();
      unsubConfig();
    };
  }, [userProfile]);

  // 2. Fetch students dynamically when sectionId changes
  useEffect(() => {
    let active = true;
    const fetchStudentsList = async () => {
      // If student search is global (cashier/admin mode and selected section is "all")
      if (selectedSectionId === 'all') {
        setStudentsLoading(true);
        try {
          // If superadmin or cashier, we might fetch students across all sections. 
          // However, fetching sections on the fly is highly selective. Let's iterate through the active sections.
          const promises = sections.map(async (sec) => {
            const q = query(collection(db, `sections/${sec.id}/students`));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ 
              id: d.id, 
              ...d.data(), 
              sectionId: sec.id, 
              sectionName: sec.name,
              gradeLevel: sec.gradeLevel 
            } as any as Student));
          });
          const studentArrays = await Promise.all(promises);
          const flatResult = studentArrays.flat();
          if (active) {
            setStudentsList(flatResult);
            setStudentsLoading(false);
          }
        } catch (error) {
          console.error("Error fetching all students:", error);
          if (active) setStudentsLoading(false);
        }
      } else {
        setStudentsLoading(true);
        try {
          const q = query(collection(db, `sections/${selectedSectionId}/students`));
          const snap = await getDocs(q);
          const sectionRef = sections.find(s => s.id === selectedSectionId);
          if (active) {
            setStudentsList(snap.docs.map(d => ({ 
              id: d.id, 
              ...d.data(), 
              sectionId: selectedSectionId,
              sectionName: sectionRef?.name || '',
              gradeLevel: sectionRef?.gradeLevel || 0
            } as any as Student)));
            setStudentsLoading(false);
          }
        } catch (error) {
          console.error("Error fetching section students:", error);
          if (active) setStudentsLoading(false);
        }
      }
    };

    fetchStudentsList();
    return () => {
      active = false;
    };
  }, [selectedSectionId, sections]);

  // Filter students based on role, section scope, search query, grade levels
  const actionableStudents = useMemo(() => {
    return studentsList.filter(student => {
      // 1. Advisers cannot see or collect for sections that aren't their own, unless they are a Cashier
      if (!isAuthorizedCashier) {
        const studentSec = sections.find(s => s.id === student.sectionId);
        const isActiveAdviser = studentSec?.adviserEmail?.toLowerCase() === userProfile?.email.toLowerCase();
        if (!isActiveAdviser) return false;
      }

      // 2. Search query filter
      const fullSearchString = `${student.name} ${student.lastName || ''} ${student.firstName || ''} ${student.lrn || ''}`.toLowerCase();
      if (stdSearchQuery.trim() && !fullSearchString.includes(stdSearchQuery.toLowerCase())) {
        return false;
      }

      // 3. Grade filter
      const currentGradeFilter = initialSelectedSection ? initialSelectedSection.gradeLevel.toString() : gradeFilter;
      if (currentGradeFilter !== 'all' && Number(student.gradeLevel) !== Number(currentGradeFilter)) {
        return false;
      }

      // Filter out dropped/transferred
      if (student.status === 'Dropped Out' || student.status === 'Transferred Out') {
        return false;
      }

      return true;
    });
  }, [studentsList, stdSearchQuery, gradeFilter, isAuthorizedCashier, userProfile, sections, initialSelectedSection]);

  // Map school years dynamically for simple pickers
  const schoolYears = useMemo(() => {
    const list = new Set<string>();
    fees.forEach(f => list.add(f.schoolYear));
    list.add(activeSchoolYear);
    return Array.from(list);
  }, [fees, activeSchoolYear]);

  // Compute stats lookup per student
  // We compute total billed, total paid, status (Paid, Partial, Unpaid) for the selection
  const studentPTALedger = useMemo(() => {
    const ledger: {
      [studentId: string]: {
        [feeId: string]: {
          billed: number;
          paid: number;
          balance: number;
          status: 'Paid' | 'Partial' | 'Unpaid';
          payments: PTAPayment[];
        }
      }
    } = {};

    actionableStudents.forEach(st => {
      ledger[st.id] = {};
      fees.forEach(fee => {
        // Find relevant payment records for this student and this fee
        const stFeePayments = payments.filter(p => p.studentId === st.id && p.feeId === fee.id);
        const totalPaid = stFeePayments.reduce((acc, p) => acc + p.amountPaid, 0);
        const billed = fee.amount;
        const balance = billed - totalPaid;
        
        let status: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
        if (totalPaid >= billed) {
          status = 'Paid';
        } else if (totalPaid > 0) {
          status = 'Partial';
        }

        ledger[st.id][fee.id] = {
          billed,
          paid: totalPaid,
          balance,
          status,
          payments: stFeePayments
        };
      });
    });

    return ledger;
  }, [actionableStudents, fees, payments]);

  // 3. Setup/Audit Log Helper
  const writeAuditLog = async (actionType: PTAAuditLog['actionType'], details: string) => {
    if (!userProfile) return;
    const schoolId = userProfile.schoolId || 'default_school';
    try {
      await addDoc(collection(db, 'pta_audit_logs'), {
        actionType,
        details,
        performedByEmail: userProfile.email,
        performedByName: userProfile.displayName || userProfile.email.split('@')[0].toUpperCase(),
        timestamp: new Date().toISOString(),
        schoolId
      });
    } catch (e) {
      console.error("Critical: Failed to record audit path", e);
    }
  };

  const handleClearAuditLogs = () => {
    if (auditLogs.length === 0) {
      alert("No logs to clear.");
      return;
    }
    setShowClearAuditConfirm(true);
  };

  const handleClearAllPayments = () => {
    if (payments.length === 0) {
      alert("No payments recorded.");
      return;
    }
    setShowClearAllPaymentsConfirm(true);
  };
  
  const executeClearAllPayments = async () => {
    try {
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      payments.forEach((p) => {
        currentBatch.delete(doc(db, 'pta_payments', p.id));
        count++;
        if (count === 500) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      if (count > 0) batches.push(currentBatch.commit());
      await Promise.all(batches);
      
      await writeAuditLog(
        'system_action', 
        `Permanently cleared ALL ${payments.length} PTA payments and reset OR count.`
      );
    } catch(err) {
      handleFirestoreError(err, 'delete', 'pta_payments');
    } finally {
      setShowClearAllPaymentsConfirm(false);
    }
  };

  const executeClearAuditLogs = async () => {
    try {
      const logsToClear = [...auditLogs]; // Keep a copy of length
      const batches = [];
      let currentBatch = writeBatch(db);
      let count = 0;
      logsToClear.forEach((log) => {
        currentBatch.delete(doc(db, 'pta_audit_logs', log.id));
        count++;
        if (count === 500) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(db);
          count = 0;
        }
      });
      if (count > 0) batches.push(currentBatch.commit());
      await Promise.all(batches);
      
      setTimeout(async () => {
        await writeAuditLog(
          'system_action', 
          `Permanently cleared ALL ${logsToClear.length} PTA audit logs.`
        );
      }, 500);
    } catch(err) {
      handleFirestoreError(err, 'delete', 'pta_audit_logs');
    } finally {
      setShowClearAuditConfirm(false);
    }
  };

  // 4. Save fee templates (Create/Update)
  const handleSaveFeeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    const schoolId = userProfile.schoolId || 'default_school';

    if (!feeFormName || feeFormAmount <= 0 || !feeFormYear) {
      alert("Please provide valid PTA contribution name, Amount, and School year.");
      return;
    }

    try {
      const data: Omit<PTAFee, 'id'> = {
        name: feeFormName.trim(),
        amount: Number(feeFormAmount),
        description: feeFormDescription.trim(),
        schoolYear: feeFormYear.trim(),
        semester: feeFormSemester,
        status: feeFormStatus,
        isVoluntary: true, // Rigid rule complying with DepEd guidance
        createdBy: userProfile.email,
        createdAt: new Date().toISOString(),
        schoolId
      };

      if (editingFee) {
        await updateDoc(doc(db, 'pta_fees', editingFee.id), {
          ...data,
          updatedAt: new Date().toISOString()
        });
        await writeAuditLog(
          'fee_setup_update', 
          `Updated PTA Fee Entry: "${data.name}" [Amount: ₱${data.amount}, SY: ${data.schoolYear}, Status: ${data.status}]`
        );
      } else {
        await addDoc(collection(db, 'pta_fees'), data);
        await writeAuditLog(
          'fee_setup_create', 
          `Created Official PTA Fee Entry: "${data.name}" [Amount: ₱${data.amount}, SY: ${data.schoolYear}] clearly declared as strictly voluntary`
        );
      }

      setEditingFee(null);
      setFeeFormName('');
      setFeeFormAmount(0);
      setFeeFormDescription('');
      setFeeFormSemester('Full Year');
      setFeeFormStatus('active');
      setShowFeeModal(false);
    } catch(err) {
      handleFirestoreError(err, 'write', 'pta_fees');
    }
  };

  // 5. Toggle fee Status (Quick Activate / Deactivate)
  const handleToggleFeeStatus = async (fee: PTAFee) => {
    const newStatus = fee.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'pta_fees', fee.id), { status: newStatus });
      await writeAuditLog(
        'fee_setup_update', 
        `Toggled PTA Fee status for "${fee.name}": Changed to ${newStatus.toUpperCase()}`
      );
    } catch(err) {
      handleFirestoreError(err, 'update', `pta_fees/${fee.id}`);
    }
  };

  // 6. Delete a Fee entry (trigged via custom alert or modal confirm overlays)
  const handleDeleteFee = (fee: PTAFee) => {
    setDeleteConfirmFee(fee);
  };

  const executeDeleteSingleFee = async (fee: PTAFee) => {
    try {
      await deleteDoc(doc(db, 'pta_fees', fee.id));
      await writeAuditLog(
        'fee_setup_update', 
        `Permanently DELETED PTA Fee config item: "${fee.name}" (Amount: ₱${fee.amount})`
      );
      setDeleteConfirmFee(null);
    } catch(err) {
      handleFirestoreError(err, 'delete', `pta_fees/${fee.id}`);
    }
  };

  // Trigger all entries deletion configuration flow
  const handleDeleteAllFees = () => {
    if (fees.length === 0) {
      alert("No registered voluntary PTA fee entries found to delete.");
      return;
    }
    setDeleteConfirmFee('all');
    setTypedConfirmText('');
  };

  const executeDeleteAllFees = async () => {
    if (fees.length === 0) return;
    try {
      const totalToDelete = fees.length;
      for (const fee of fees) {
        await deleteDoc(doc(db, 'pta_fees', fee.id));
      }
      await writeAuditLog(
        'fee_setup_update', 
        `Permanently DELETED ALL registered PTA Fee config items (${totalToDelete} items cleared)`
      );
      setDeleteConfirmFee(null);
      setTypedConfirmText('');
    } catch(err) {
      handleFirestoreError(err, 'delete', 'pta_fees');
    }
  };

  // 7. Add Cashier email Setup
  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashierEmail.trim() || !userProfile) return;
    const schoolId = userProfile.schoolId || 'default_school';
    
    const emailToSet = newCashierEmail.trim().toLowerCase();
    if (cashierEmails.includes(emailToSet)) {
      alert("Email is already in Cashier list.");
      return;
    }

    const updated = [...cashierEmails, emailToSet];
    try {
      // Find the existing config doc or create one using a custom key
      const docRef = doc(db, 'settings', `pta_config_${schoolId}`);
      await updateDoc(docRef, { cashierEmails: updated })
        .catch(async (err) => {
          // If the document does not exist, create it cleanly
          await setDoc(docRef, {
            id: `pta_config_${schoolId}`,
            cashierEmails: updated,
            schoolId
          });
        });
      
      setCashierEmails(updated);
      setNewCashierEmail('');
      await writeAuditLog(
        'fee_setup_update', 
        `Granted Cashier privileges to: ${emailToSet}`
      );
    } catch(err) {
      handleFirestoreError(err, 'write', 'settings');
    }
  };

  // 8. Remove Cashier email
  const handleRemoveCashier = (email: string) => {
    setCashierToRemove(email);
  };

  const confirmRemoveCashier = async () => {
    if (!cashierToRemove) return;
    if (!userProfile) return;
    const schoolId = userProfile.schoolId || 'default_school';
    
    const updated = cashierEmails.filter(e => e !== cashierToRemove);
    try {
      const docRef = doc(db, 'settings', `pta_config_${schoolId}`);
      await updateDoc(docRef, { cashierEmails: updated });
      setCashierEmails(updated);
      await writeAuditLog(
        'fee_setup_update', 
        `Revoked Cashier privileges from: ${cashierToRemove}`
      );
      setCashierToRemove(null);
    } catch (err) {
      handleFirestoreError(err, 'write', `settings/pta_config_${schoolId}`);
    }
  };

  // Generate next incremental OR number
  const generateNextOrNumber = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const prefix = currentYear;

    const sameYearPayments = payments.filter(p => p.orNumber?.startsWith(prefix));
    
    if (sameYearPayments.length === 0) {
      return `${prefix}${(1).toString().padStart(4, '0')}`;
    }
    
    const orNumbers = sameYearPayments
      .map(p => {
        if (!p.orNumber) return 0;
        let numStr = p.orNumber;
        if (numStr.startsWith(prefix)) {
            numStr = numStr.substring(prefix.length);
        } else if (numStr.startsWith('OR-')) {
            numStr = numStr.substring(3);
        }
        const digits = numStr.replace(/\D/g, '');
        const parsed = parseInt(digits, 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter(num => num > 0);
      
    const maxNum = orNumbers.length > 0 ? Math.max(...orNumbers) : 0;
    return `${prefix}${(maxNum + 1).toString().padStart(4, '0')}`;
  };

  // 9. Process/Receive PTA Contributions
  const handleOpenReceivePayment = (student: Student, fee: PTAFee) => {
    // Determine how much is already paid
    const record = studentPTALedger[student.id]?.[fee.id];
    const maxDue = record ? record.balance : fee.amount;
    
    // Auto-generate next O.R. number
    const automaticOr = generateNextOrNumber();
    
    setPaymentTarget({ student, fee });
    setPayAmount(maxDue);
    setPayOrNumber(automaticOr);
    setPayRemarks('');
    setPayDate(new Date().toISOString().split('T')[0]);
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget || !userProfile) return;
    
    const { student, fee } = paymentTarget;
    const amount = Number(payAmount);

    if (amount <= 0) {
      alert("Amount paid must be greater than zero.");
      return;
    }

    try {
      const schoolId = userProfile.schoolId || 'default_school';
      const paymentRef = collection(db, 'pta_payments');
      
      const newPayment: Omit<PTAPayment, 'id'> = {
        studentId: student.id,
        studentName: formatStudentName(student),
        lrn: student.lrn || 'N/A',
        sectionId: student.sectionId,
        sectionName: student.sectionName || '',
        gradeLevel: student.gradeLevel || 0,
        feeId: fee.id,
        feeName: fee.name,
        amountPaid: amount,
        paymentDate: payDate,
        orNumber: payOrNumber.trim() || 'N/A',
        collectorName: payCollector.trim(),
        collectorEmail: userProfile.email,
        schoolYear: fee.schoolYear,
        remarks: payRemarks.trim(),
        schoolId,
        createdAt: new Date().toISOString()
      };

      const docAdded = await addDoc(paymentRef, newPayment);
      
      // Auto-trigger full recipe printer presentation
      setShowReceipt({ id: docAdded.id, ...newPayment } as PTAPayment);

      await writeAuditLog(
        'payment_record', 
        `PTA Collection recorded: Received ₱${amount} from student "${newPayment.studentName}" (LRN: ${newPayment.lrn}) for "${fee.name}" (SY: ${fee.schoolYear}). OR-No: ${newPayment.orNumber}, Collected by ${newPayment.collectorName}`
      );

      setShowPaymentModal(false);
      setPaymentTarget(null);
    } catch(err) {
      handleFirestoreError(err, 'create', 'pta_payments');
    }
  };

  const [voidConfirmPayment, setVoidConfirmPayment] = useState<PTAPayment | null>(null);

  // 10. Undo/Void recorded payment
  const handleVoidPayment = (paymentItem: PTAPayment) => {
    if (!isSuperAdmin) {
      alert("Only system administrators or school finance managers are authorized to void payment transactions.");
      return;
    }
    setVoidConfirmPayment(paymentItem);
  };

  const executeVoidPayment = async () => {
    if (!voidConfirmPayment) return;
    try {
      await deleteDoc(doc(db, 'pta_payments', voidConfirmPayment.id));
      await writeAuditLog(
        'payment_void', 
        `VOIDED PTA Payment log: Removed receipt for ${voidConfirmPayment.studentName} tracking ₱${voidConfirmPayment.amountPaid} under OR-${voidConfirmPayment.orNumber}`
      );
      setVoidConfirmPayment(null);
      setShowReceipt(null);
    } catch (err) {
      handleFirestoreError(err, 'delete', `pta_payments/${voidConfirmPayment.id}`);
    } finally {
      setVoidConfirmPayment(null);
    }
  };

  // 11. Reports & Financial Insights formulas
  // Active selected year filter inside reports (fallback to activeSY)
  const [repSchoolYear, setRepSchoolYear] = useState(activeSchoolYear);

  // Grouped payments by fee
  const analysisReport = useMemo(() => {
    // 1. Get active fees in the selected year
    const activePeriodFees = fees.filter(f => f.schoolYear === repSchoolYear);
    
    // Total registered active students
    // We count actionable students belonging to the chosen SY
    const studentsInYear = studentsList.length || 0; 

    let totalBilled = 0;
    let totalCollected = 0;
    const feeCollectedBreakdown: { [feeId: string]: { name: string; amount: number; collected: number; paidUsers: number; totalUsers: number } } = {};

    activePeriodFees.forEach(fee => {
      const feePayments = payments.filter(p => p.feeId === fee.id && p.schoolYear === repSchoolYear);
      const totalCollectedForFee = feePayments.reduce((acc, p) => acc + p.amountPaid, 0);
      
      // Calculate how many have fully paid this fee
      const fullyPaidCount = studentsList.filter(st => {
        const pList = payments.filter(pay => pay.studentId === st.id && pay.feeId === fee.id);
        const sumPay = pList.reduce((sum, p) => sum + p.amountPaid, 0);
        return sumPay >= fee.amount;
      }).length;

      feeCollectedBreakdown[fee.id] = {
        name: fee.name,
        amount: fee.amount,
        collected: totalCollectedForFee,
        paidUsers: fullyPaidCount,
        totalUsers: studentsInYear
      };

      totalBilled += fee.amount * studentsInYear;
      totalCollected += totalCollectedForFee;
    });

    // Class levels billing metrics
    const classLedgerBreakdown: { [sectionId: string]: { sectionName: string; gradeLevel: number; adviser: string; totalDue: number; totalPaid: number; studentsCount: number } } = {};
    sections.forEach(sec => {
      // Find students in this section
      const secStudents = studentsList.filter(s => s.sectionId === sec.id);
      const studentCount = secStudents.length;

      let secDue = 0;
      let secPaid = 0;

      activePeriodFees.forEach(fee => {
        secDue += fee.amount * studentCount;
        const secFeePayments = payments.filter(p => p.feeId === fee.id && p.sectionId === sec.id && p.schoolYear === repSchoolYear);
        secPaid += secFeePayments.reduce((sum, p) => sum + p.amountPaid, 0);
      });

      if (studentCount > 0 || secDue > 0) {
        classLedgerBreakdown[sec.id] = {
          sectionName: sec.name,
          gradeLevel: sec.gradeLevel,
          adviser: sec.adviserName,
          totalDue: secDue,
          totalPaid: secPaid,
          studentsCount: studentCount
        };
      }
    });

    return {
      totalBilled,
      totalCollected,
      feeCollectedBreakdown,
      classLedgerBreakdown,
      totalStudentsCount: studentsInYear
    };
  }, [fees, payments, repSchoolYear, studentsList, sections]);

  // Dynamically resolve school name from active receipt context, section, or defaults
  const receiptSchoolName = useMemo(() => {
    if (!showReceipt) return 'Luzon High School';
    const originalSection = sections.find(s => s.id === showReceipt.sectionId);
    if (originalSection?.schoolName) return originalSection.schoolName;
    if (initialSelectedSection?.schoolName) return initialSelectedSection.schoolName;
    const found = sections.find(s => s.schoolName);
    if (found?.schoolName) return found.schoolName;
    return 'Luzon High School';
  }, [showReceipt, sections, initialSelectedSection]);

  // Dynamically calculate payment context for accurate partial-payment receipt reports
  const receiptFeeDetails = useMemo(() => {
    if (!showReceipt) return null;
    const relatedFee = fees.find(f => f.id === showReceipt.feeId);
    const totalFeeAmount = relatedFee ? relatedFee.amount : 0;
    const allPayments = payments.filter(p => p.studentId === showReceipt.studentId && p.feeId === showReceipt.feeId);
    
    const currentPaymentAmount = showReceipt.amountPaid;
    const showReceiptTime = showReceipt.createdAt ? new Date(showReceipt.createdAt).getTime() : Date.now();
    
    const priorPayments = allPayments.filter(p => {
      if (p.id === showReceipt.id) return false;
      const pTime = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
      return pTime <= showReceiptTime;
    });
    
    const totalPriorPaid = priorPayments.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalPaidToDate = totalPriorPaid + currentPaymentAmount;
    const remainingBalance = Math.max(0, totalFeeAmount - totalPaidToDate);
    const isPartial = totalPaidToDate < totalFeeAmount;

    return {
      totalFeeAmount,
      totalPriorPaid,
      totalPaidToDate,
      remainingBalance,
      isPartial
    };
  }, [showReceipt, fees, payments]);

  // Handle PDF Export trigger using jsPDF & HTML2Canvas for absolute precision
  const handleExportPDF = async () => {
    if (!showReceipt) return;
    
    const element = document.getElementById('receipt-print-container');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2, // Enhances print resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Keep exact aspect ratio fit inside A4 format
      const widthRatio = pdfWidth / imgWidth;
      const renderedWidth = pdfWidth;
      const renderedHeight = imgHeight * widthRatio;
      
      let finalWidth = renderedWidth;
      let finalHeight = renderedHeight;
      let xOffset = 0;
      let yOffset = 0;
      
      if (renderedHeight > pdfHeight) {
        const heightRatio = pdfHeight / imgHeight;
        finalWidth = imgWidth * heightRatio;
        finalHeight = pdfHeight;
        xOffset = (pdfWidth - finalWidth) / 2;
      } else {
        yOffset = (pdfHeight - finalHeight) / 2; // Center vertically on page
      }
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      
      const filename = `PTA_Receipt_${showReceipt.orNumber || 'N-A'}_${showReceipt.studentName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating receipt PDF with html2canvas:', error);
      
      // Clean, robust direct vector PDF fallback in case elements are hindered by the sandbox/DOM
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.setFillColor(248, 250, 252); // soft grey background
      pdf.rect(15, 15, 180, 267, 'F');
      
      pdf.setDrawColor(226, 232, 240);
      pdf.rect(15, 15, 180, 267, 'D');
      
      // Header Text
      pdf.setTextColor(148, 163, 184);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text("PARENT-TEACHER ASSOCIATION", 105, 25, { align: 'center' });
      
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text("OFFICIAL VOLUNTARY CONTRIBUTION RECEIPT", 105, 32, { align: 'center' });
      
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(receiptSchoolName.toUpperCase(), 105, 38, { align: 'center' });
      
      // Receipt Details Frame
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(203, 213, 225);
      pdf.line(20, 45, 190, 45);
      
      // OR and Date
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(8);
      pdf.text("OR NUMBER", 20, 53);
      pdf.text("PAYMENT DATE", 190, 53, { align: 'right' });
      
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('courier', 'bold');
      pdf.setFontSize(11);
      pdf.text(showReceipt.orNumber, 20, 60);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(showReceipt.paymentDate, 190, 60, { align: 'right' });
      
      // Learner frame
      pdf.setFillColor(255, 255, 255);
      pdf.rect(20, 68, 170, 42, 'F');
      pdf.rect(20, 68, 170, 42, 'D');
      
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(8);
      pdf.text("LEARNER DETAILS", 24, 74);
      
      pdf.setTextColor(71, 85, 105);
      pdf.setFontSize(9);
      pdf.text("Full Name:", 24, 82);
      pdf.text("LRN:", 24, 89);
      pdf.text("Section/Grade:", 24, 96);
      
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(showReceipt.studentName?.toUpperCase() || 'UNKNOWN', 55, 82);
      pdf.text(showReceipt.lrn || '', 55, 89);
      pdf.text(`${(showReceipt.sectionName || '').toUpperCase()} (Grade ${showReceipt.gradeLevel || 'N/A'})`, 55, 96);
      
      // Particulars
      const relatedFee = fees.find(f => f.id === showReceipt.feeId);
      const totalFeeAmount = relatedFee ? relatedFee.amount : 0;
      const allPaymentsForThisFee = payments.filter(p => p.studentId === showReceipt.studentId && p.feeId === showReceipt.feeId);
      const currentPaymentAmount = showReceipt.amountPaid;
      
      const showReceiptTime = showReceipt.createdAt ? new Date(showReceipt.createdAt).getTime() : Date.now();
      const priorPayments = allPaymentsForThisFee.filter(p => {
        if (p.id === showReceipt.id) return false;
        const pTime = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
        return pTime <= showReceiptTime;
      });
      
      const totalPriorPaid = priorPayments.reduce((acc, p) => acc + p.amountPaid, 0);
      const totalPaidToDate = totalPriorPaid + currentPaymentAmount;
      const remainingBalance = Math.max(0, totalFeeAmount - totalPaidToDate);
      const isPartial = totalPaidToDate < totalFeeAmount;

      pdf.setFillColor(255, 255, 255);
      pdf.rect(20, 112, 170, 50, 'F');
      pdf.rect(20, 112, 170, 50, 'D');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(241, 245, 249);
      pdf.rect(20, 112, 170, 8, 'F');
      pdf.setDrawColor(203, 213, 225);
      pdf.line(20, 120, 190, 120);
      
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(7);
      pdf.text("PARTICULARS", 24, 117);
      pdf.text("AMOUNT DETAIL", 186, 117, { align: 'right' });
      
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);
      pdf.text(showReceipt.feeName, 24, 126);
      pdf.text(`PHP ${showReceipt.amountPaid.toFixed(2)}`, 186, 126, { align: 'right' });

      // Breakdown lines
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Voluntary Fee Required Target:", 24, 132);
      pdf.text(`PHP ${totalFeeAmount.toFixed(2)}`, 186, 132, { align: 'right' });

      pdf.text("Total Paid to Date (Cumulative):", 24, 138);
      pdf.text(`PHP ${totalPaidToDate.toFixed(2)}`, 186, 138, { align: 'right' });

      if (isPartial) {
        pdf.setTextColor(180, 83, 9); // amber-700
        pdf.text("Remaining Balance Outstanding:", 24, 144);
        pdf.text(`PHP ${remainingBalance.toFixed(2)}`, 186, 144, { align: 'right' });
      } else {
        pdf.setTextColor(4, 120, 87); // emerald-700
        pdf.text("Payment Status: Fully Settled", 24, 144);
        pdf.text("PHP 0.00", 186, 144, { align: 'right' });
      }
      
      pdf.setDrawColor(203, 213, 225);
      pdf.line(20, 149, 190, 149);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text("TOTAL RECEIVED AMOUNT IN THIS RECEIPT", 24, 156);
      pdf.setTextColor(79, 70, 229);
      pdf.text(`PHP ${showReceipt.amountPaid.toFixed(2)}`, 186, 156, { align: 'right' });
      
      // Footer and disclaimer
      pdf.setTextColor(148, 163, 184);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text("RECORDED COLLECTOR", 20, 170);
      
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(showReceipt.collectorName?.toUpperCase() || 'UNKNOWN', 20, 176);
      pdf.setDrawColor(148, 163, 184);
      pdf.line(20, 178, 90, 178);
      
      // Disclaimer Box
      pdf.setFillColor(238, 242, 255);
      pdf.rect(20, 195, 170, 24, 'F');
      pdf.setDrawColor(224, 231, 255);
      pdf.rect(20, 195, 170, 24, 'D');
      
      pdf.setTextColor(67, 56, 202);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text("OFFICIAL PTA DISCLOSURE COMPLIANCE", 105, 201, { align: 'center' });
      
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.text('“PTA contributions are voluntary and not mandatory under DepEd policies.”', 105, 207, { align: 'center' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(7);
      pdf.text("This receipt is proof of support and cannot hinder school enrollment or grade processing.", 105, 213, { align: 'center' });
      
      const filename = `PTA_Receipt_${showReceipt.orNumber || 'N-A'}_${showReceipt.studentName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    }
  };

  // Export to Excel handler
  const handleExportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const data: any[] = [];
    const merges: any[] = [];
    let r = 0;

    const addMerge = (startRow: number, startCol: number, endRow: number, endCol: number) => {
      merges.push({ s: { r: startRow, c: startCol }, e: { r: endRow, c: endCol } });
    };

    const activeFees = fees.filter(f => f.status === 'active');
    const totalCols = 5 + activeFees.length + 4;

    // Helper to generate perfectly styled cells
    const createCell = (
      val: any,
      options: {
        bold?: boolean;
        italic?: boolean;
        align?: 'left' | 'center' | 'right';
        bg?: string; // Hex color without '#'
        color?: string; // Hex for font color
        size?: number;
        borderTheme?: 'default' | 'none';
        numFormat?: string;
      } = {}
    ) => {
      const isNum = typeof val === 'number';
      const cellObj: any = {
        v: val === null || val === undefined ? "" : val,
        t: isNum ? 'n' : 's'
      };

      if (options.numFormat) {
        cellObj.z = options.numFormat;
      }

      const style: any = {
        font: {
          name: "Calibri",
          sz: options.size || 10,
          bold: !!options.bold,
          italic: !!options.italic
        },
        alignment: {
          horizontal: options.align || (isNum ? "right" : "left"),
          vertical: "center",
          wrapText: true
        }
      };

      if (options.color) {
        style.font.color = { rgb: options.color.replace('#', '') };
      } else {
        style.font.color = { rgb: "000000" };
      }

      if (options.bg) {
        style.fill = {
          patternType: "solid",
          fgColor: { rgb: options.bg.replace('#', '') }
        };
      }

      if (options.borderTheme !== 'none') {
        const borderCol = "A6A6A6"; // Clean medium-gray border
        style.border = {
          top: { style: "thin", color: { rgb: borderCol } },
          bottom: { style: "thin", color: { rgb: borderCol } },
          left: { style: "thin", color: { rgb: borderCol } },
          right: { style: "thin", color: { rgb: borderCol } }
        };
      } else {
        style.border = {};
      }

      cellObj.s = style;
      return cellObj;
    };

    const padRow = (rowCells: any[], total: number, bgHex?: string) => {
      const result = [...rowCells];
      while (result.length < total) {
        result.push(createCell("", { bg: bgHex, borderTheme: bgHex ? "default" : "none" }));
      }
      return result;
    };

    // --- Elegant Header Layout ---
    data.push(padRow([createCell("REPUBLIC OF THE PHILIPPINES", { size: 9, italic: true, bold: true, align: "center", color: "595959", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    data.push(padRow([createCell("DEPARTMENT OF EDUCATION", { size: 12, bold: true, align: "center", color: "107C41", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    const selectedSectionName = activeSection?.name || "All Sections";
    data.push(padRow([createCell("PARENT-TEACHER ASSOCIATION INDIVIDUAL CONTRIBUTION SUMMARY", { size: 13, bold: true, align: "center", color: "1F2937", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    const subtitleText = `School Year: ${activeSchoolYear}  |  Section: ${selectedSectionName} (Grade ${activeSection?.gradeLevel || 'N/A'})  |  Exported Date: ${new Date().toLocaleDateString()}`;
    data.push(padRow([createCell(subtitleText, { size: 10, bold: true, align: "center", color: "4B5563", borderTheme: "none" })], totalCols));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    const disclaimerText = "NOTICE: PTA contributions are voluntary and not mandatory under DepEd policies. All balances displayed are for transparency reporting only.";
    data.push(padRow([createCell(disclaimerText, { size: 8.5, italic: true, bold: true, align: "center", bg: "FFF1F2", color: "9F1239" })], totalCols, "FFF1F2"));
    addMerge(r, 0, r, totalCols - 1);
    r++;

    // Space row
    data.push(padRow([], totalCols));
    r++;

    // --- Table Headers ---
    const headerBg = "1E293B"; // Dark slate
    const headerColor = "FFFFFF";

    const headerCells = [
      createCell("No.", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }),
      createCell("LRN", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }),
      createCell("Learner Info", { bold: true, size: 10, align: "left", bg: headerBg, color: headerColor }),
      createCell("Section", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }),
      createCell("Grade", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }),
    ];

    activeFees.forEach(fee => {
      headerCells.push(
        createCell(`${fee.name} Paid\n(₱${fee.amount.toLocaleString()})`, { bold: true, size: 9.5, align: "center", bg: headerBg, color: headerColor })
      );
    });

    headerCells.push(createCell("Total Required\nTarget", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }));
    headerCells.push(createCell("Total Value\nPaid", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }));
    headerCells.push(createCell("Overall Remaining\nBalance", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }));
    headerCells.push(createCell("Status", { bold: true, size: 10, align: "center", bg: headerBg, color: headerColor }));

    data.push(headerCells);
    r++;

    // --- Student Rows grouped by Sex ---
    const sexes: ('Male' | 'Female')[] = ['Male', 'Female'];
    sexes.forEach(sex => {
      const sexStudents = actionableStudents
        .filter(s => (s.sex || 'Male') === sex)
        .sort((a, b) => {
          const nameA = formatStudentName(a).toLowerCase();
          const nameB = formatStudentName(b).toLowerCase();
          return nameA.localeCompare(nameB);
        });

      if (sexStudents.length === 0) return;

      // Male/Female Section Header Row
      const sexHeaderBg = "F1F5F9";
      const sexHeaderCells = [
        createCell(`${sex.toUpperCase()} LEARNERS (${sexStudents.length})`, { bold: true, size: 10, bg: sexHeaderBg, color: "000000" })
      ];
      data.push(padRow(sexHeaderCells, totalCols, sexHeaderBg));
      addMerge(r, 0, r, totalCols - 1);
      r++;

      // Student Data Rows
      sexStudents.forEach((student, idx) => {
        const rowBg = idx % 2 === 0 ? "FFFFFF" : "F8FAFC"; // Zebra striping

        const totalTarget = activeFees.reduce((sum, fee) => sum + fee.amount, 0);
        const totalPaid = activeFees.reduce((sum, fee) => sum + (studentPTALedger[student.id]?.[fee.id]?.paid || 0), 0);
        const remainingBalance = Math.max(0, totalTarget - totalPaid);
        const isFullySettled = totalPaid >= totalTarget && totalTarget > 0;

        const studentRow = [
          createCell(idx + 1, { align: "center", bg: rowBg }),
          createCell(student.lrn || 'N/A', { align: "center", bg: rowBg }),
          createCell(formatStudentName(student), { align: "left", bold: true, bg: rowBg }),
          createCell(student.sectionName || 'N/A', { align: "center", bg: rowBg }),
          createCell(student.gradeLevel ? `Grade ${student.gradeLevel}` : 'N/A', { align: "center", bg: rowBg }),
        ];

        // Specific Fee paid values
        activeFees.forEach(fee => {
          const feeLedger = studentPTALedger[student.id]?.[fee.id];
          const amountPaid = feeLedger?.paid || 0;
          studentRow.push(
            createCell(amountPaid, { align: "right", numFormat: '"₱"#,##0.00', bg: rowBg, color: "000000" })
          );
        });

        // Combined Target
        studentRow.push(
          createCell(totalTarget, { align: "right", numFormat: '"₱"#,##0.00', bg: rowBg, color: "000000" })
        );

        // Emphasis Total Paid (Indigo theme shading: light indigo background, dark indigo text)
        studentRow.push(
          createCell(totalPaid, { align: "right", bold: true, numFormat: '"₱"#,##0.00', bg: "EEF2FF", color: "4338CA" })
        );

        // Emphasis Remaining Balance (Rose theme shading for active balance, else neutral black)
        studentRow.push(
          createCell(remainingBalance, { 
            align: "right", 
            bold: true, 
            numFormat: '"₱"#,##0.00', 
            bg: remainingBalance > 0 ? "FFF1F2" : rowBg, 
            color: remainingBalance > 0 ? "E11D48" : "000000" 
          })
        );

        // Cleared Status highlight
        studentRow.push(
          createCell(isFullySettled ? "Cleared" : "Active Balance", {
            align: "center",
            bold: true,
            bg: isFullySettled ? "ECFDF5" : "FFFBEB",
            color: isFullySettled ? "047857" : "B45309"
          })
        );

        data.push(studentRow);
        r++;
      });
    });

    // --- Grand Totals Row ---
    let grandTargetSum = 0;
    let grandPaidSum = 0;
    let grandRemainingSum = 0;
    const feeTotals: { [key: string]: number } = {};
    activeFees.forEach(fee => {
      feeTotals[fee.id] = 0;
    });

    actionableStudents.forEach(st => {
      const target = activeFees.reduce((sum, fee) => sum + fee.amount, 0);
      const paid = activeFees.reduce((sum, fee) => sum + (studentPTALedger[st.id]?.[fee.id]?.paid || 0), 0);
      grandTargetSum += target;
      grandPaidSum += paid;
      grandRemainingSum += Math.max(0, target - paid);

      activeFees.forEach(fee => {
        feeTotals[fee.id] += (studentPTALedger[st.id]?.[fee.id]?.paid || 0);
      });
    });

    const totalsBg = "E2E8F0"; // Slate-200 border bg
    const grandTotalsRow = [
      createCell("GRAND TOTALS", { bold: true, size: 10, align: "center", bg: totalsBg, color: "000000" }),
      createCell("", { bg: totalsBg }),
      createCell(`Registered: ${actionableStudents.length}`, { bold: true, size: 10, bg: totalsBg, color: "000000" }),
      createCell("", { bg: totalsBg }),
      createCell("", { bg: totalsBg })
    ];

    activeFees.forEach(fee => {
      grandTotalsRow.push(
        createCell(feeTotals[fee.id], { bold: true, align: "right", numFormat: '"₱"#,##0.00', bg: totalsBg, color: "000000" })
      );
    });

    // Total required target
    grandTotalsRow.push(
      createCell(grandTargetSum, { bold: true, align: "right", numFormat: '"₱"#,##0.00', bg: totalsBg, color: "000000" })
    );

    // Total Paid emphasis (bright blue/indigo cell highlight, navy font)
    grandTotalsRow.push(
      createCell(grandPaidSum, { bold: true, align: "right", numFormat: '"₱"#,##0.00', bg: "C7D2FE", color: "4338CA" })
    );

    // Total Remaining Balance emphasis (bright soft red cell highlight, dark red font)
    grandTotalsRow.push(
      createCell(grandRemainingSum, { bold: true, align: "right", numFormat: '"₱"#,##0.00', bg: "FCA5A5", color: "991B1B" })
    );

    // Status blank
    grandTotalsRow.push(
      createCell("", { bg: totalsBg })
    );

    data.push(grandTotalsRow);
    addMerge(r, 0, r, 1); // Merge GRAND TOTALS over No. and LRN
    addMerge(r, 3, r, 4); // Merge over Section and Grade
    r++;

    // Generate sheet & workbook
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // --- Precise Column Widths to Avoid Overlapping data completely ---
    const cols = [
      { wch: 6 },  // No.
      { wch: 16 }, // LRN
      { wch: 28 }, // Learner name
      { wch: 15 }, // Section
      { wch: 12 }, // Grade
    ];

    activeFees.forEach(() => {
      cols.push({ wch: 22 }); // Fee Columns
    });

    cols.push(
      { wch: 18 }, // Total Target
      { wch: 18 }, // Total Paid
      { wch: 22 }, // Overall Balance
      { wch: 15 }  // Status
    );

    worksheet['!cols'] = cols;
    worksheet['!merges'] = merges;

    // Set row height to 25 to give comfortable vertical breathing room for headers
    const rowHeights: any[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i === 6) {
        rowHeights.push({ hpx: 32 }); // Header of table receives double content height
      } else {
        rowHeights.push({ hpx: 20 }); // standard comfortable padding
      }
    }
    worksheet['!rows'] = rowHeights;

    XLSX.utils.book_append_sheet(workbook, worksheet, "PTA Contribution Records");

    XLSX.writeFile(workbook, `PTA_Contributions_Summary_${selectedSectionName.replace(/\s+/g, '_')}_${activeSchoolYear}.xlsx`);
  };

  return (
    <div className="w-full space-y-0 pb-12 bg-slate-50 min-h-screen font-sans animate-fade-in" id="pta-fees-portal">
      {/* 1. Official Page Header - matching the premium header style of other pages */}
      <header className="bg-white border-b border-slate-200 px-10 py-5 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-5">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
            <Coins size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              PTA FEES & CONTRIBUTIONS
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">Official</span>
            </h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">
              Manage setups, collections and audits for active SY {activeSchoolYear}
            </p>
          </div>
        </div>

        {/* Module Nav Toggles */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 border border-slate-200/60 w-full md:w-auto overflow-x-auto shrink-0">
          {isAdviserOfSelectedSection && (
            <button 
              onClick={() => setPtaTab('collection')}
              className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${ptaTab === 'collection' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <CreditCard size={13} />
              Receive Collections
            </button>
          )}
          <button 
            onClick={() => setPtaTab('summary')}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${ptaTab === 'summary' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <UserCheck size={13} />
            Learner Summary
          </button>
          <button 
            onClick={() => setPtaTab('reports')}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${ptaTab === 'reports' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <BarChart2 size={13} />
            Financial Reports
          </button>
          {isSystemAdmin && (
            <>
              <button 
                onClick={() => setPtaTab('all-payments')}
                className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${ptaTab === 'all-payments' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Database size={13} />
                All Payments
              </button>
              <button 
                onClick={() => setPtaTab('setup')}
                className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${ptaTab === 'setup' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-900'}`}
              >
                <Layers size={13} />
                PTA Fees Setup
              </button>
            </>
          )} 
          <button 
            onClick={() => setPtaTab('audit')}
            className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${ptaTab === 'audit' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/40' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Clock size={13} />
            Audit Log
          </button>
        </div>
      </header>

      {/* 2. DepEd Policy strict disclaimer banner inside portal, now placed cleanly below the header */}
      <div className="bg-amber-50 border-b border-amber-200 px-10 py-3 text-amber-900 flex justify-between space-x-2 md:items-center relative z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="text-amber-600 shrink-0" size={18} />
          <p className="text-xs md:text-sm font-semibold tracking-wide">
            <span className="font-bold underline text-amber-950">DepEd Policy Compliance Notice:</span> “PTA’s collections are strictly voluntary. Enrolling, grading, and release of grades cannot be withheld due to PTA contribution standing.”
          </p>
        </div>
        <div className="bg-amber-600/10 text-amber-800 font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-widest hidden md:inline-block">
          Voluntary Status
        </div>
      </div>

      {/* Main Container Content Segment */}
      <div className="px-10 py-10 space-y-8">

        {/* Dynamic sub-tab screen outputs */}

        {/* ---------------- VIEW A: COLLECTIONS LEDGER (RECEIVE PAYMENT) ---------------- */}
        {ptaTab === 'collection' && (
          <div className="space-y-6">
            
            {/* Filtering Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Search learners</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, LRN..."
                    value={stdSearchQuery}
                    onChange={(e) => setStdSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold placeholder-slate-400 active:bg-white focus:bg-white text-slate-800 transition-all focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Class choice filter */}
              <div className="w-full md:w-48 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Section</label>
                <select 
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className={`px-3 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-black ${initialSelectedSection ? 'text-slate-500 opacity-80 cursor-not-allowed' : 'text-slate-700'}`}
                  disabled={!!initialSelectedSection} // Locking to provided section context if active
                >
                  {initialSelectedSection ? (
                    <option value={initialSelectedSection.id}>{initialSelectedSection.name} (Gr. {initialSelectedSection.gradeLevel})</option>
                  ) : (
                    <>
                      <option value="all">All Sections (Entire School)</option>
                      {sections.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name} (Gr. {sec.gradeLevel})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Grade levels filter */}
              <div className="w-full md:w-36 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Grade Level</label>
                <select 
                  value={initialSelectedSection ? initialSelectedSection.gradeLevel.toString() : gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className={`px-3 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-black ${initialSelectedSection ? 'text-slate-500 opacity-80 cursor-not-allowed' : 'text-slate-700'}`}
                  disabled={!!initialSelectedSection} // Locking to provided section context if active
                >
                  {initialSelectedSection ? (
                    <option value={initialSelectedSection.gradeLevel.toString()}>Grade {initialSelectedSection.gradeLevel}</option>
                  ) : (
                    <>
                      <option value="all">All Grades</option>
                      {[7, 8, 9, 10, 11, 12].map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Clear filters or export report */}
              <div className="w-full md:w-auto flex items-center justify-end space-x-2">
                <button 
                  onClick={handleExportToExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Export active selections to DepEd formatted spreadsheet"
                >
                  <FileSpreadsheet size={15} />
                  Export Sheet
                </button>
              </div>
            </div>

            {/* PTA Fees Contributions Matrix Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Learner Financial Transparency Ledger</h3>
                  <p className="text-[11px] font-semibold text-slate-500">Showing {actionableStudents.length} active registered learners</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 anim-pulse"></div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                    Discharge Mode: {isAuthorizedCashier ? "Finance Cashier (Full Access)" : "Section Adviser (Scoped View)"}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                {studentsLoading ? (
                  <div className="p-10 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="animate-spin text-slate-400" size={32} />
                    <p className="text-xs text-slate-500 font-bold">Querying learners from database...</p>
                  </div>
                ) : actionableStudents.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <AlertCircle className="mx-auto text-slate-300" size={36} />
                    <p className="text-sm font-bold text-slate-700">No matching learners found</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">Either the search keyword matched nothing, or you do not have permission to collect payments in this section scope.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Learner Info</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Section / Grade</th>
                        {fees.filter(f => f.status === 'active').map(fee => (
                          <th key={fee.id} className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                            <span className="block font-black text-slate-700">{fee.name}</span>
                            <span className="text-[10px] text-slate-400 block font-bold">₱{fee.amount} ({fee.semester === 'Full Year' ? 'Year' : 'Sem'})</span>
                          </th>
                        ))}
                        <th className="px-5 py-3 text-center text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50/30 border-l border-indigo-100">Contribution Summary</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(['Male', 'Female'] as const).map(sex => {
                      const sexStudents = actionableStudents
                        .filter(s => (s.sex || 'Male') === sex)
                        .sort((a, b) => {
                          const nameA = formatStudentName(a).toLowerCase();
                          const nameB = formatStudentName(b).toLowerCase();
                          return nameA.localeCompare(nameB);
                        });

                      if (sexStudents.length === 0) return null;
                      
                      return (
                        <React.Fragment key={sex}>
                          <tr className="bg-slate-100">
                            <td colSpan={3 + fees.filter(f => f.status === 'active').length} className="px-5 py-2 text-xs font-black text-slate-600 uppercase tracking-wider">
                              {sex} Learners ({sexStudents.length})
                            </td>
                          </tr>
                          {sexStudents.map(student => (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                    {student.lastName?.[0] || ""}{student.firstName?.[0] || ""}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-800">{formatStudentName(student)}</h4>
                                    <span className="font-mono text-[10px] text-slate-400 block font-bold">LRN: {student.lrn || 'Missing'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold block w-max uppercase tracking-wider">{student.sectionName || 'N/A'}</span>
                                <span className="text-[10px] text-slate-400 block font-bold">Grade {student.gradeLevel || 'N/A'}</span>
                              </td>

                              {/* Dynamic PTA Fees templates evaluation */}
                              {fees.filter(f => f.status === 'active').map(fee => {
                                const ledg = studentPTALedger[student.id]?.[fee.id] || { paid: 0, balance: fee.amount, status: 'Unpaid' };
                                
                                return (
                                  <td key={fee.id} className="px-5 py-4 whitespace-nowrap text-center">
                                    <div className="inline-flex flex-col items-center">
                                      {/* Payment status badge */}
                                      <div className="flex flex-col gap-1 items-center">
                                        {ledg.status === 'Paid' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-heavy tracking-wider">
                                            <CheckCircle2 size={10} /> Fully Paid
                                          </span>
                                        ) : ledg.status === 'Partial' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-heavy tracking-wider">
                                            Partial (₱{ledg.paid})
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-heavy tracking-wider">
                                            Unpaid
                                          </span>
                                        )}

                                        {/* OR List for paid/partial payments */}
                                        {(ledg.status === 'Paid' || ledg.status === 'Partial') && (
                                          <div className="flex flex-col gap-1 mt-1">
                                            {ledg.payments.map((p) => (
                                              <button
                                                key={p.id}
                                                onClick={() => setShowReceipt(p)}
                                                className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 font-bold whitespace-nowrap"
                                              >
                                                OR #{p.orNumber}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Cashier process payment action */}
                                      <div className="mt-1.5">
                                        {canCollectPayments && ledg.status !== 'Paid' ? (
                                          <button 
                                            onClick={() => handleOpenReceivePayment(student, fee)}
                                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-[10px] font-black text-indigo-700 uppercase tracking-widest transition-colors flex items-center gap-0.5"
                                          >
                                            <Coins size={10} /> Collect
                                          </button>
                                        ) : ledg.status !== 'Paid' && (
                                          <span className="text-[9px] font-bold text-slate-400 italic">Adviser Only</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              })}
                              
                              {/* Total Contribution Summary Cell */}
                              <td className="px-5 py-4 whitespace-nowrap text-center bg-indigo-50/10 border-l border-indigo-50">
                                <div className="flex flex-col items-center justify-center h-full">
                                  <span className="text-xl font-black text-indigo-700">
                                    ₱{fees.filter(f => f.status === 'active').reduce((sum, fee) => sum + (studentPTALedger[student.id]?.[fee.id]?.paid || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    of ₱{fees.filter(f => f.status === 'active').reduce((sum, fee) => sum + fee.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Target
                                  </span>
                                  {(() => {
                                      const totPaid = fees.filter(f => f.status === 'active').reduce((sum, fee) => sum + (studentPTALedger[student.id]?.[fee.id]?.paid || 0), 0);
                                      const totAmt = fees.filter(f => f.status === 'active').reduce((sum, fee) => sum + fee.amount, 0);
                                      if (totAmt === 0) return null;
                                      if (totPaid >= totAmt) return <span className="mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><CheckCircle2 size={10} /> Fully Settled</span>;
                                      return null;
                                  })()}
                                </div>
                              </td>

                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VIEW A.2: LEARNER SUMMARY ---------------- */}
        {ptaTab === 'summary' && (
          <div className="space-y-6">
            {/* Filtering Box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Search learners</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by name, LRN..."
                    value={stdSearchQuery}
                    onChange={(e) => setStdSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold placeholder-slate-400 active:bg-white focus:bg-white text-slate-800 transition-all focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Class choice filter */}
              <div className="w-full md:w-48 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Section</label>
                <select 
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className={`px-3 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-black ${initialSelectedSection ? 'text-slate-500 opacity-80 cursor-not-allowed' : 'text-slate-700'}`}
                  disabled={!!initialSelectedSection} // Locking to provided section context if active
                >
                  {initialSelectedSection ? (
                    <option value={initialSelectedSection.id}>{initialSelectedSection.name} (Gr. {initialSelectedSection.gradeLevel})</option>
                  ) : (
                    <>
                      <option value="all">All Sections (Entire School)</option>
                      {sections.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name} (Gr. {sec.gradeLevel})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Grade levels filter */}
              <div className="w-full md:w-36 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Grade Level</label>
                <select 
                  value={initialSelectedSection ? initialSelectedSection.gradeLevel.toString() : gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className={`px-3 py-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-black ${initialSelectedSection ? 'text-slate-500 opacity-80 cursor-not-allowed' : 'text-slate-700'}`}
                  disabled={!!initialSelectedSection} // Locking to provided section context if active
                >
                  {initialSelectedSection ? (
                    <option value={initialSelectedSection.gradeLevel.toString()}>Grade {initialSelectedSection.gradeLevel}</option>
                  ) : (
                    <>
                      <option value="all">All Grades</option>
                      {[7, 8, 9, 10, 11, 12].map(g => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              
              <div className="w-full md:w-auto flex items-center justify-end space-x-2">
                <button 
                  onClick={() => {
                    const printContents = document.getElementById('learner-summary-print-container')?.innerHTML;
                    if (printContents) {
                      const printWindow = {
                        document: {
                          write: (html: string) => printHTMLContent(html),
                          close: () => {}
                        }
                      };
                      if (printWindow) {
                        const styleBlock = `
                          <style>
                            @page { size: landscape; margin: 10mm; } 
                            body { font-family: sans-serif; padding: 10px; color: #000; background: #fff; } 
                            
                            /* Layout & spacing */
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10px; page-break-inside: auto; } 
                            thead { display: table-header-group; }
                            tr { page-break-inside: avoid; break-inside: avoid; } 
                            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; vertical-align: middle; color: #000; } 
                            th { background-color: #f8fafc; text-transform: uppercase; color: #000; font-weight: bold; font-size: 9px; letter-spacing: 0.05em; } 
                            
                            /* Formatting help classes */
                            .text-center { text-align: center; } 
                            .font-bold { font-weight: bold; } 
                            .font-black { font-weight: 800; }
                            .text-indigo-700, .text-indigo-600, .text-indigo-500 { color: #4338ca !important; } 
                            .text-rose-600, .text-rose-500 { color: #e11d48 !important; } 
                            .bg-slate-150 { background-color: #f1f5f9; }
                            .bg-slate-100 { background-color: #f1f5f9; }
                            .bg-slate-50\\/50 { background-color: #f8fafc; }
                            .border-b { border-bottom: 1px solid #e2e8f0; }
                            .text-black { color: #000 !important; }
                            .text-slate-900, .text-slate-800, .text-slate-700, .text-slate-600, .text-slate-500, .text-slate-400 { color: #000 !important; }
                            .uppercase { text-transform: uppercase; }
                            .tracking-wider { letter-spacing: 0.05em; }
                            .rounded { border-radius: 4px; }
                            .px-2 { padding-left: 8px; padding-right: 8px; }
                            .py-0.5 { padding-top: 2px; padding-bottom: 2px; }
                            .text-xs { font-size: 10px; }
                            .text-sm { font-size: 11px; }
                            .text-lg { font-size: 13px; }
                            .rounded-full { border-radius: 9999px; }
                            .w-8 { width: 32px; }
                            .h-8 { height: 32px; }
                            
                            /* Flex support for printed row elements */
                            .flex { display: flex; } 
                            .flex-col { flex-direction: column; } 
                            .items-center { align-items: center; } 
                            .justify-center { justify-content: center; } 
                            .gap-2 { gap: 8px; } 
                            .space-x-3 > * + * { margin-left: 12px; }
                            .hidden { display: none; }
                          </style>
                        `;
                        printWindow.document.write('<html><head><title>Learner Contribution Summary</title>' + styleBlock + '</head><body>' + printContents + '<script>window.onload = function() { window.onafterprint = function() { window.close(); }; window.onfocus = function() { setTimeout(function() { window.close(); }, 800); }; setTimeout(function() { window.print(); }, 500); };</script></body></html>');
                        printWindow.document.close();
                      }
                    }
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Print learner contribution summary"
                >
                  <Printer size={15} />
                  Print Summary
                </button>
                <button 
                  onClick={handleExportToExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Export active selections to DepEd formatted spreadsheet"
                >
                  <FileSpreadsheet size={15} />
                  Export Sheet
                </button>
              </div>
            </div>

            {/* Learner Summary Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" id="learner-summary-print-container">
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-black uppercase tracking-wider">Learner Individual Contribution Summary</h3>
                  <p className="text-[11px] font-semibold text-black">Overview of {actionableStudents.length} learners' total PTA financial contributions</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                {studentsLoading ? (
                  <div className="p-10 flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="animate-spin text-slate-400" size={32} />
                    <p className="text-xs text-slate-500 font-bold">Querying learners from database...</p>
                  </div>
                ) : actionableStudents.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <AlertCircle className="mx-auto text-slate-300" size={36} />
                    <p className="text-sm font-bold text-slate-700">No matching learners found</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-bold text-black uppercase tracking-widest">Learner Info</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-black uppercase tracking-widest">Section / Grade</th>
                        {fees.filter(f => f.status === 'active').map(fee => (
                          <th key={fee.id} className="px-5 py-3 text-center text-xs font-bold text-black uppercase tracking-wider font-mono">
                            <span className="block font-black text-black">{fee.name}</span>
                            <span className="text-[10px] text-black block font-bold">₱{fee.amount} ({fee.semester === 'Full Year' ? 'Year' : 'Sem'})</span>
                          </th>
                        ))}
                        <th className="px-5 py-3 text-center text-xs font-bold text-black uppercase tracking-widest">Total Required Target</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50/30">Total Value Paid</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-rose-500 uppercase tracking-widest bg-rose-50/30">Overall Remaining Balance</th>
                        <th className="px-5 py-3 text-center text-xs font-bold text-black uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {(['Male', 'Female'] as const).map(sex => {
                      const sexStudents = actionableStudents
                        .filter(s => (s.sex || 'Male') === sex)
                        .sort((a, b) => {
                          const nameA = formatStudentName(a).toLowerCase();
                          const nameB = formatStudentName(b).toLowerCase();
                          return nameA.localeCompare(nameB);
                        });

                      if (sexStudents.length === 0) return null;
                      
                      return (
                        <React.Fragment key={sex}>
                          <tr className="bg-slate-100">
                            <td colSpan={6 + fees.filter(f => f.status === 'active').length} className="px-5 py-2 text-xs font-black text-black uppercase tracking-wider">
                              {sex} Learners ({sexStudents.length})
                            </td>
                          </tr>
                          {sexStudents.map(student => {
                            const totalTarget = fees.filter(f => f.status === 'active').reduce((sum, fee) => sum + fee.amount, 0);
                            const totalPaid = fees.filter(f => f.status === 'active').reduce((sum, fee) => sum + (studentPTALedger[student.id]?.[fee.id]?.paid || 0), 0);
                            const remainingBalance = Math.max(0, totalTarget - totalPaid);
                            const isFullySettled = totalPaid >= totalTarget && totalTarget > 0;

                            return (
                              <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-black">
                                      {student.lastName?.[0] || ""}{student.firstName?.[0] || ""}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-black text-black">{formatStudentName(student)}</h4>
                                      <span className="font-mono text-[10px] text-black block font-bold">LRN: {student.lrn || 'Missing'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <span className="px-2 py-0.5 inline-block bg-slate-100 text-black rounded text-[10px] font-bold uppercase tracking-wider">{student.sectionName || 'N/A'}</span>
                                    <span className="text-[10px] text-black block font-bold">Grade {student.gradeLevel || 'N/A'}</span>
                                  </div>
                                </td>
                                {fees.filter(f => f.status === 'active').map(fee => {
                                  const feeLedger = studentPTALedger[student.id]?.[fee.id];
                                  const amountPaid = feeLedger?.paid || 0;
                                  return (
                                    <td key={fee.id} className="px-5 py-4 whitespace-nowrap text-center">
                                      <span className="text-sm font-bold text-black">₱{amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </td>
                                  )
                                })}
                                <td className="px-5 py-4 whitespace-nowrap text-center">
                                  <span className="text-sm font-bold text-black">₱{totalTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center bg-indigo-50/10">
                                  <span className="text-lg font-black text-indigo-700">₱{totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center bg-rose-50/10">
                                  <span className={`text-sm font-black ${remainingBalance > 0 ? 'text-rose-600' : 'text-black'}`}>₱{remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </td>
                                <td className="px-5 py-4 whitespace-nowrap text-center">
                                  {isFullySettled ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-black rounded-full text-[10px] font-heavy tracking-wider">
                                      <CheckCircle2 size={12} className="text-black" /> Cleared
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-black rounded-full text-[10px] font-heavy tracking-wider">
                                      Active Balance
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VIEW B: PTA FEES CONFIGURATION & SETUP ---------------- */}
        {ptaTab === 'setup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Panel: Create or Edit PTA Fee configurations (Only for active Admin) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">PTArs Contributions Template</h3>
                  <div className="bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-widest flex items-center gap-1">
                    <Sparkles size={10} /> Voluntary Check
                  </div>
                </div>

                {isSystemAdmin ? (
                  <form onSubmit={handleSaveFeeSetup} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contribution Item Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Annual PTA Support Fund, General Projects"
                        value={feeFormName}
                        onChange={(e) => setFeeFormName(e.target.value)}
                        className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-heavy text-slate-800"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Voluntary Amount (₱)</label>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="e.g. 150"
                          value={feeFormAmount || ''}
                          onChange={(e) => setFeeFormAmount(Number(e.target.value))}
                          className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-heavy text-slate-800 font-mono"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">School Year</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 2025-2026"
                          value={feeFormYear}
                          onChange={(e) => setFeeFormYear(e.target.value)}
                          className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-heavy text-slate-800 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Applies To</label>
                        <select 
                          value={feeFormSemester}
                          onChange={(e) => setFeeFormSemester(e.target.value as any)}
                          className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        >
                          <option value="Full Year">Full Year</option>
                          <option value="1st Semester">1st Semester</option>
                          <option value="2nd Semester">2nd Semester</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Initial Status</label>
                        <select 
                          value={feeFormStatus}
                          onChange={(e) => setFeeFormStatus(e.target.value as any)}
                          className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        >
                          <option value="active">Active (Visible)</option>
                          <option value="inactive">Inactive (Hidden)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Description / PTA Target Scope</label>
                      <textarea 
                        rows={3}
                        placeholder="Purpose of contribution, project description, general terms..."
                        value={feeFormDescription}
                        onChange={(e) => setFeeFormDescription(e.target.value)}
                        className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-heavy text-slate-800"
                      />
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 transition-all rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <Check size={14} className="stroke-2" />
                        {editingFee ? "Update official Fee entry" : "Create official Fee entry"}
                      </button>
                    </div>

                    {editingFee && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingFee(null);
                          setFeeFormName('');
                          setFeeFormAmount(0);
                          setFeeFormDescription('');
                          setFeeFormSemester('Full Year');
                        }}
                        className="w-full py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-200"
                      >
                        Cancel Editing
                      </button>
                    )}
                  </form>
                ) : (
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-xs font-bold text-center space-y-1">
                    <ShieldAlert className="mx-auto text-slate-400" size={24} />
                    <p>Setup Management Locked</p>
                    <p className="text-[10px] font-medium font-normal text-slate-400">Only authorized System Administrators can encode official voluntary school fund configurations.</p>
                  </div>
                )}
              </div>

              {/* Authorized Cashiers registry config */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center space-x-1.5">
                  <UserCheck size={16} className="text-slate-600" />
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Authorized Finance Cashiers</h3>
                </div>

                {isSystemAdmin ? (
                  <form onSubmit={handleAddCashier} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Add staff email as Cashier</label>
                      <div className="flex gap-2">
                        <input 
                          type="email" 
                          placeholder="e.g. clerk@deped.gov.ph"
                          value={newCashierEmail}
                          onChange={(e) => setNewCashierEmail(e.target.value)}
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 lowercase placeholder-slate-400"
                          required
                        />
                        <button 
                          type="submit" 
                          className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all hover:bg-black"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </form>
                ) : null}

                {/* Cashier List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                  {cashierEmails.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No custom cashier emails. Only overall Admins can collect school-wide.</p>
                  ) : (
                    cashierEmails.map(email => (
                      <div key={email} className="flex justify-between items-center bg-slate-50 px-3 py-2 border border-slate-100 rounded-xl">
                        <span className="text-xs font-medium text-slate-700 font-mono truncate">{email}</span>
                        {isSystemAdmin ? (
                          <button 
                            onClick={() => handleRemoveCashier(email)}
                            className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-all"
                            title="Deauthorize cashier"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel: Official fees template configured database overview */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Registered Voluntary PTA Fee Entries</h3>
                  <p className="text-[11px] font-semibold text-slate-500">Official configurations encoded per school year/semester</p>
                </div>
                {isSystemAdmin && fees.length > 0 && (
                  <button
                    onClick={handleDeleteAllFees}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 hover:shadow-indigo-100"
                    title="Permanently core clear all registered voluntary fee entries"
                  >
                    <Trash2 size={13} />
                    Delete All
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {fees.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 space-y-2">
                    <Coins size={36} className="mx-auto text-slate-300" />
                    <p className="text-xs font-black">No official PTA contributions setups currently configured</p>
                    <p className="text-[10px] font-normal text-slate-400">Manage the portal templates to record receipts.</p>
                  </div>
                ) : (
                  fees.map(fee => (
                    <div key={fee.id} className="p-5 hover:bg-slate-50/50 transition-colors flex justify-between items-start flex-col sm:flex-row gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-black text-indigo-700 font-mono">₱{fee.amount}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">{fee.semester}</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black uppercase tracking-widest font-mono">SY {fee.schoolYear}</span>
                          
                          {fee.status === 'active' ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-heavy tracking-wider">active</span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-heavy tracking-wider">inactive</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800">{fee.name}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-1 pr-4 leading-relaxed">{fee.description || 'No description provided.'}</p>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          Encoded by: <span className="font-mono text-slate-600">{fee.createdBy}</span>
                        </div>
                      </div>

                      {/* Config actions */}
                      {isSystemAdmin && (
                        <div className="flex items-center space-x-1 shrink-0 self-end sm:self-start">
                          <button 
                            onClick={() => handleToggleFeeStatus(fee)}
                            className={`px-2 py-1 text-[10px] font-extrabold rounded-lg border transition-all ${fee.status === 'active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                            title="Turn on/off visibility"
                          >
                            {fee.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingFee(fee);
                              setFeeFormName(fee.name);
                              setFeeFormAmount(fee.amount);
                              setFeeFormDescription(fee.description || '');
                              setFeeFormYear(fee.schoolYear);
                              setFeeFormSemester(fee.semester);
                              setFeeFormStatus(fee.status);
                              setShowFeeModal(true);
                              document.getElementById('pta-fees-portal')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                            title="Edit general meta details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteFee(fee)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                            title="Permanently remove template"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VIEW C: COMPREHENSIVE TRANSPARENCY REPORTS ---------------- */}
        {ptaTab === 'reports' && (
          <div className="space-y-6">

            {/* School year chooser for reports segment */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Reports & Analytics Scope</h3>
                <p className="text-[11px] font-semibold text-slate-500">Pick academic cycle to evaluate school contributions progress</p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Year:</span>
                <select 
                  value={repSchoolYear}
                  onChange={(e) => setRepSchoolYear(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  {schoolYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Stat Card 1: Total voluntary fund collections */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Collected</span>
                    <div className="p-1.5 bg-emerald-50 rounded text-emerald-600"><Coins size={16} /></div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mt-2">₱{analysisReport.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold italic mt-2">Strictly voluntary, non-coercive school level fund size.</p>
              </div>

              {/* Stat Card 2: Estimated School Wide Standing */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Collection Progress</span>
                    <div className="p-1.5 bg-indigo-50 rounded text-indigo-600"><BarChart2 size={16} /></div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mt-2">
                    {analysisReport.totalBilled > 0 
                      ? `${Math.round((analysisReport.totalCollected / analysisReport.totalBilled) * 100)}%`
                      : '0%'
                    }
                  </h2>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${analysisReport.totalBilled > 0 ? Math.min((analysisReport.totalCollected / analysisReport.totalBilled) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Stat Card 3: Active contributions item setups */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Contribution Templates</span>
                    <div className="p-1.5 bg-amber-50 rounded text-amber-600"><Layers size={16} /></div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mt-2">{Object.keys(analysisReport.feeCollectedBreakdown).length} Items</h2>
                </div>
                <p className="text-[10px] text-indigo-600 font-semibold mt-2">Evaluated for <span className="font-bold underline">{analysisReport.totalStudentsCount} registered learners</span></p>
              </div>
            </div>

            {/* In-depth Breakdown Table: Collections by Fee Template */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Collections Standing per PTA Approved Item</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Fee Name</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Amount / Lrn</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Estimated Yield</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Collected Stand</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Fully Paid Counts</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Actual Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 font-medium">
                    {Object.keys(analysisReport.feeCollectedBreakdown).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-xs text-slate-400 font-bold">
                          No active templates recorded in database for chosen period.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(analysisReport.feeCollectedBreakdown).map(([feeId, statsObj]) => {
                        const stats = statsObj as any;
                        const estYield = stats.amount * stats.totalUsers;
                        const fillRate = estYield > 0 ? (stats.collected / estYield) * 105 : 0;
                        
                        return (
                          <tr key={feeId}>
                            <td className="px-5 py-4 text-xs font-black text-slate-800">{stats.name}</td>
                            <td className="px-5 py-4 text-center font-mono text-xs font-bold">₱{stats.amount}</td>
                            <td className="px-5 py-4 text-center font-mono text-xs font-bold">₱{estYield.toLocaleString()}</td>
                            <td className="px-5 py-4 text-center font-mono text-xs font-black text-indigo-700">₱{stats.collected.toLocaleString()}</td>
                            <td className="px-5 py-4 text-center text-xs text-slate-600 font-bold">{stats.paidUsers} / {stats.totalUsers} Students</td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                                {Math.round(fillRate)}% Collection Ratio
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section level breakdown list */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Class-by-Class Enrollment PTA Standing</h3>
                <span className="text-[10px] font-black underline text-indigo-700 uppercase tracking-widest">Audit Transparency Map</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Grade / Section</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Class Adviser</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Learner Base</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Target Standing due</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Collected Stand</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Collection Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 font-semibold text-slate-700">
                    {Object.keys(analysisReport.classLedgerBreakdown).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-xs text-slate-400 font-bold">
                          No sections configured in database yet.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(analysisReport.classLedgerBreakdown).map(([secId, secStatsObj]) => {
                        const secStats = secStatsObj as any;
                        const classProgress = secStats.totalDue > 0 ? (secStats.totalPaid / secStats.totalDue) * 100 : 0;
                        
                        return (
                          <tr key={secId} className="hover:bg-slate-50/20 text-xs">
                            <td className="px-5 py-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold uppercase tracking-wider">Gr. {secStats.gradeLevel} - {secStats.sectionName}</span>
                            </td>
                            <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-bold">{secStats.adviser}</td>
                            <td className="px-5 py-4 text-center font-mono">{secStats.studentsCount} Learners</td>
                            <td className="px-5 py-4 text-center font-mono">₱{secStats.totalDue.toLocaleString()}</td>
                            <td className="px-5 py-4 text-center font-mono text-emerald-700">₱{secStats.totalPaid.toLocaleString()}</td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${classProgress >= 80 ? 'bg-emerald-100 text-emerald-800' : classProgress >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                {Math.round(classProgress)}% Received
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VIEW D: TRANS-PARENT & AUDITING CHRONICLE ---------------- */}
        {ptaTab === 'all-payments' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">All PTA Payments</h3>
                  <p className="text-[11px] font-semibold text-slate-500">List of all collected payments across all school years.</p>
                </div>
                <button
                  onClick={handleClearAllPayments}
                  className="text-[9px] font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-rose-700"
                >
                  <Trash2 size={11} />
                  Delete ALL Payments (Reset OR Count)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">O.R.</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Fee</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">SY</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 font-semibold text-slate-700">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-xs text-slate-400 font-bold">
                          No payments recorded.
                        </td>
                      </tr>
                    ) : (
                      payments.map(p => (
                        <tr key={p.id} className="text-xs hover:bg-slate-50">
                          <td className="px-5 py-3 font-mono font-bold text-slate-700">{p.orNumber}</td>
                          <td className="px-5 py-3">{p.studentName}</td>
                          <td className="px-5 py-3 text-indigo-700">{p.feeName}</td>
                          <td className="px-5 py-3 text-center text-emerald-700">₱{p.amountPaid.toLocaleString()}</td>
                          <td className="px-5 py-3 text-center">{p.schoolYear}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- VIEW D: TRANS-PARENT & AUDITING CHRONICLE ---------------- */}
        {ptaTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Permanent PTA Fin Audit Chronicle</h3>
                  <p className="text-[11px] font-semibold text-slate-500">Unmodifiable list of actions logged for absolute transparency and compliance with DepEd zero corruption policy</p>
                </div>
                <div className="flex gap-2">
                  {auditLogs.length > 0 && (
                     <button
                       onClick={handleClearAuditLogs}
                       className="text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors border border-rose-100"
                     >
                       <Trash2 size={11} />
                       Clear Audit Log
                     </button>
                  )}
                  <div className="bg-rose-50 border border-rose-100 rounded px-2.5 py-1 flex items-center space-x-1">
                    <ShieldAlert className="text-rose-600" size={13} />
                    <span className="text-[9px] font-black text-rose-800 uppercase tracking-wider">Read Only Log</span>
                  </div>
                </div>
              </div>

              {/* Log Timeline Container */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <div className="p-10 text-center text-slate-400 space-y-1">
                    <Clock size={32} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold">No transactions or modifications have been captured yet.</p>
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="pt-4 flex items-start space-x-3 text-xs">
                      <div className="mt-0.5">
                        {log.actionType.startsWith('fee_') ? (
                          <div className="p-1.5 bg-amber-50 rounded text-amber-700 border border-amber-100"><Layers size={14} /></div>
                        ) : log.actionType === 'payment_void' ? (
                          <div className="p-1.5 bg-rose-50 rounded text-rose-700 border border-rose-100"><ShieldAlert size={14} /></div>
                        ) : (
                          <div className="p-1.5 bg-emerald-50 rounded text-emerald-700 border border-emerald-100"><Coins size={14} /></div>
                        )}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold uppercase text-[10px] text-slate-500 tracking-wider">
                            {log.actionType.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-800 font-bold leading-relaxed">{log.details}</p>
                        <div className="text-[10px] font-semibold text-slate-400">
                          Performed by: <span className="font-mono text-slate-600 font-heavy">{log.performedByEmail}</span> ({log.performedByName})
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- MODAL OVERLAY A: RECEIVE PAYMENT DIALOG ---------------- */}
      {showPaymentModal && paymentTarget && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[9px] font-heavy tracking-widest text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded uppercase font-black">Record Collection</span>
                <h3 className="text-sm font-black text-slate-900 mt-1">Receive voluntary contribution</h3>
              </div>
              <button 
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentTarget(null);
                }}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Learner Name:</span>
                <span className="text-slate-800 font-black">{paymentTarget.student.name}</span>
              </div>
              {paymentTarget.student.lrn && (
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">LRN:</span>
                  <span className="text-slate-800 font-mono font-bold">{paymentTarget.student.lrn}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-1.5 mt-1">
                <span className="text-slate-400 font-bold">PTA Fund Item:</span>
                <span className="text-indigo-700 font-black">{paymentTarget.fee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Est. Contribution Due:</span>
                <span className="text-slate-800 font-black font-mono">₱{paymentTarget.fee.amount}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Received voluntary Amount (₱)</label>
                <input 
                  type="number" 
                  min="1"
                  max={paymentTarget.fee.amount}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="p-2.5 w-full bg-slate-50 border border-slate-250 rounded-xl text-xs font-black text-slate-800 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Official Receipt (O.R.) No.</label>
                  <input 
                    type="text" 
                    value={payOrNumber}
                    readOnly
                    className="p-2.5 w-full bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-500 font-mono cursor-not-allowed"
                    required
                  />
                  <span className="text-[9px] text-slate-400 block font-semibold">Automatically generated sequential serial.</span>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Collection Date</label>
                  <input 
                    type="date" 
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Designated Collector Name</label>
                <input 
                  type="text" 
                  value={payCollector}
                  onChange={(e) => setPayCollector(e.target.value)}
                  className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Remarks (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. partial contribution"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="p-2.5 w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              {/* Voluntary compliance disclaimer inside collect dialogue */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[10px] text-amber-800 font-medium">
                ⚠️ **Strict Compliance:** Voluntary contribution receipts should declare the statement "PTA contributions are voluntary and not mandatory under DepEd policies."
              </div>

              <div className="pt-2 flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentTarget(null);
                  }}
                  className="w-1/3 py-2.5 border border-slate-200 text-slate-500 text-xs font-black uppercase rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl tracking-widest shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} />
                  Record Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL OVERLAY B: DEPT-STYLE OFFICIAL RECEIPT ---------------- */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col my-4">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Coins className="text-indigo-400" size={16} />
                <span className="text-xs font-black uppercase tracking-wider">Official Contribution Receipt</span>
              </div>
              <button 
                onClick={() => setShowReceipt(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Area */}
            <div className="p-8 space-y-6 flex-1 text-slate-800" id="receipt-print-container">
              {/* Receipt Header styling */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                <h2 className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase mt-[0.75rem]">PARENT-TEACHER ASSOCIATION</h2>
                <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">OFFICIAL PTA RECEIPT</h1>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">{receiptSchoolName}</p>
              </div>

              {/* Receipt Core statistics */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">OR Number</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-heavy text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm tracking-wide">{showReceipt.orNumber}</span>
                    {receiptFeeDetails?.isPartial ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black rounded uppercase border border-amber-200">
                        Partial Payment
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded uppercase border border-emerald-200">
                        Fully Settled
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Payment Date</span>
                  <span className="font-bold text-slate-900">{showReceipt.paymentDate}</span>
                </div>
              </div>

              {/* Student details */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Learner Details</span>
                  <span className="text-[9px] font-heavy uppercase px-1.5 py-0.5 bg-slate-250/50 rounded font-bold">{showReceipt.schoolYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Full Name:</span>
                  <span className="text-slate-900 font-black uppercase text-xs">{showReceipt.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">LRN:</span>
                  <span className="text-slate-900 font-mono font-bold text-xs">{showReceipt.lrn}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-1.5 mt-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px]">Section</span>
                    <span className="text-slate-800 font-bold uppercase">{showReceipt.sectionName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-bold block text-[9px]">Grade level</span>
                    <span className="text-slate-800 font-bold">Grade {showReceipt.gradeLevel}</span>
                  </div>
                </div>
              </div>

              {/* Payment amounts receipt description */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between text-[9px] font-black text-slate-400 uppercase">
                  <span>Particulars</span>
                  <span>Contribution Size</span>
                </div>
                <div className="p-4 flex justify-between items-center font-bold">
                  <div>
                    <h4 className="text-slate-900 font-black">{showReceipt.feeName}</h4>
                    <span className="text-[10px] text-slate-400 font-normal">Strictly voluntary parent association fund</span>
                  </div>
                  <span className="font-mono text-slate-900 text-sm font-black">₱{showReceipt.amountPaid.toFixed(2)}</span>
                </div>

                {receiptFeeDetails && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Voluntary Fee Target:</span>
                      <span className="font-mono font-bold text-slate-800">₱{receiptFeeDetails.totalFeeAmount.toFixed(2)}</span>
                    </div>
                    {receiptFeeDetails.totalPriorPaid > 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Prior Paid Amount:</span>
                        <span className="font-mono">₱{receiptFeeDetails.totalPriorPaid.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-800 font-medium">
                      <span>Paid in This Receipt:</span>
                      <span className="font-mono">₱{showReceipt.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-slate-200/50 pt-1.5 mt-1">
                      {receiptFeeDetails.isPartial ? (
                        <>
                          <span className="text-amber-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block animate-pulse"></span>
                            Remaining Balance Due:
                          </span>
                          <span className="font-mono text-amber-700 font-heavy">₱{receiptFeeDetails.remainingBalance.toFixed(2)}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                            Status: Fully Settled
                          </span>
                          <span className="font-mono text-emerald-700">₱0.00</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-black uppercase text-[10px]">Total Received Amount</span>
                  <span className="font-mono text-indigo-700 font-black text-base">₱{showReceipt.amountPaid.toFixed(2)}</span>
                </div>
              </div>

              {/* Collector credentials footer details */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Recorded Collector</span>
                    <span className="text-xs font-black text-slate-800 border-b border-slate-300 pb-0.5 block pr-4">{showReceipt.collectorName}</span>
                  </div>
                  {isSuperAdmin && (
                    <button 
                      onClick={() => handleVoidPayment(showReceipt)}
                      className="px-2.5 py-1 text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-[10px] font-black uppercase rounded tracking-wider flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Trash2 size={10} /> Void Record
                    </button>
                  )}
                  <button 
                      onClick={() => {
                        const printWindow = {
                          document: {
                            write: (html: string) => printHTMLContent(html),
                            close: () => {}
                          }
                        };
                        if (printWindow) {
                          const receiptHTML = `
                          <div style="font-family: Arial, sans-serif; max-width: 100%; margin: 0 auto; color: #111;">
                            <div style="text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 20px;">
                              <div style="font-size: 10px; font-weight: bold; letter-spacing: 2px; color: #666; text-transform: uppercase;">Parent-Teacher Association</div>
                              <div style="font-size: 18px; font-weight: 900; margin-top: 5px; text-transform: uppercase;">Official PTA Receipt</div>
                              <div style="font-size: 12px; font-weight: bold; color: #333; margin-top: 5px; text-transform: uppercase;">${receiptSchoolName || 'PTA'}</div>
                            </div>
                            
                            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
                              <div>
                                <div style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase;">OR Number</div>
                                <div style="font-weight: bold; font-family: monospace; font-size: 14px;">${showReceipt.orNumber}</div>
                              </div>
                              <div style="text-align: right;">
                                <div style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase;">Payment Date</div>
                                <div style="font-weight: bold;">${showReceipt.paymentDate}</div>
                              </div>
                            </div>
                            
                            <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; background: #f9f9f9;">
                              <div style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Learner Details (${showReceipt.schoolYear})</div>
                              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #666;">Full Name:</span>
                                <span style="font-weight: bold; text-transform: uppercase;">${showReceipt.studentName}</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span style="color: #666;">LRN:</span>
                                <span style="font-family: monospace; font-weight: bold;">${showReceipt.lrn}</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 10px;">
                                <div>
                                  <div style="font-size: 10px; color: #666;">Section</div>
                                  <div style="font-weight: bold; text-transform: uppercase;">${showReceipt.sectionName}</div>
                                </div>
                                <div style="text-align: right;">
                                  <div style="font-size: 10px; color: #666;">Grade Level</div>
                                  <div style="font-weight: bold; text-transform: uppercase;">Grade ${showReceipt.gradeLevel}</div>
                                </div>
                              </div>
                            </div>
                            
                            <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
                              <div style="padding: 15px; font-size: 12px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                  <span style="font-weight: bold;">${showReceipt.feeName}</span>
                                  <span style="font-weight: bold; font-family: monospace;">PHP ${showReceipt.amountPaid.toFixed(2)}</span>
                                </div>
                              </div>
                              <div style="background: #f1f5f9; padding: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Total Received Amount</span>
                                <span style="font-size: 16px; font-weight: 900; color: #1e1b4b; font-family: monospace;">PHP ${showReceipt.amountPaid.toFixed(2)}</span>
                              </div>
                            </div>
                            
                            <div style="margin-bottom: 30px;">
                              <div style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase;">Recorded Collector</div>
                              <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 2px; padding-right: 40px; margin-top: 5px;">${showReceipt.collectorName}</div>
                            </div>
                            
                            <div style="text-align: center; border: 1px solid #e0e7ff; background: #eef2ff; border-radius: 8px; padding: 15px;">
                              <div style="font-size: 9px; font-weight: bold; color: #312e81; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">OFFICIAL PTA DISCLOSURE COMPLIANCE</div>
                              <div style="font-size: 11px; font-weight: bold; font-style: italic; color: #3730a3; margin-bottom: 5px;">"PTA contributions are voluntary and not mandatory under DepEd policies."</div>
                              <div style="font-size: 9px; color: #64748b;">This receipt is proof of voluntary parent support and cannot hinder school enrollment or grade processing.</div>
                            </div>
                          </div>
                          `;
                          printWindow.document.write('<html><head><title>Official PTA Receipt - ' + showReceipt.orNumber + '</title><style>@page { size: A5 portrait; margin: 15mm; } body { padding: 0; margin: 0; }</style></head><body>' + receiptHTML + '<script>window.onload = function() { window.onafterprint = function() { window.close(); }; window.onfocus = function() { setTimeout(function() { window.close(); }, 800); }; setTimeout(function() { window.print(); }, 500); };</script></body></html>');
                          printWindow.document.close();
                        }
                      }}
                      className="px-2.5 py-1 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-[10px] font-black uppercase rounded tracking-wider flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <Printer size={10} /> Print Receipt
                    </button>
                </div>

                {/* Highly compliant statutory official disclaimer */}
                <div className="text-center p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-xl space-y-1">
                  <p className="text-[9.5px] font-bold text-indigo-950 uppercase tracking-widest">OFFICIAL PTA DISCLOSURE COMPLIANCE</p>
                  <p className="text-[10.5px] font-heavy italic text-indigo-900 leading-relaxed">
                    “PTA contributions are voluntary and not mandatory under DepEd policies.”
                  </p>
                  <p className="text-[8.5px] text-slate-400 leading-none mt-1">This receipt is proof of voluntary parent support and cannot hinder school enrollment or grade processing.</p>
                </div>
              </div>
            </div>

            {/* Print trigger footer controls */}
            <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex justify-end space-x-2 shrink-0">
              <button 
                onClick={() => setShowReceipt(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                Close View
              </button>
              <button 
                onClick={handleExportPDF}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                <Download size={14} />
                Export to PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Removal Confirmation Modal */}
      <AnimatePresence>
        {cashierToRemove && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert size={24} />
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-slate-900">Remove Cashier?</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">This will revoke financial collection privileges for:</p>
                  <p className="text-sm font-bold text-slate-800 font-mono mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">{cashierToRemove}</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setCashierToRemove(null)}
                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRemoveCashier}
                    className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-sm shadow-rose-200 hover:bg-rose-700 hover:shadow-md transition-all flex justify-center items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Revoke
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Fee Deletion / Purge Confirmation Modals */}
      <AnimatePresence>
        {deleteConfirmFee && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                  <ShieldAlert size={24} />
                </div>
                
                {deleteConfirmFee === 'all' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Purge All Registered Fees?</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider mt-1 text-rose-600">⚠️ CRITICAL DANGER ZONE ACTION</p>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2">
                        You are about to permanently delete <strong className="font-extrabold text-slate-800">{fees.length}</strong> registered voluntary PTA fee configurations. This configuration deletion is immediate, recursive, and cannot be reverted in the future.
                      </p>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-xs text-rose-950 space-y-1">
                      <p className="font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-rose-600 shrink-0" />
                        DESTRUCTION LEVEL CLEARANCE
                      </p>
                      <p className="font-medium text-rose-800/90 mt-1">
                        Any unpaid reference structures or templates for parents in active portals will be fully unlinked. Active billing records configured for this year will be cleared.
                      </p>
                    </div>

                    <div className="space-y-1.5 focus-within:text-indigo-600">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Type <strong className="text-rose-600 font-black">DELETE ALL</strong> to verify authorization
                      </label>
                      <input
                        type="text"
                        value={typedConfirmText}
                        onChange={(e) => setTypedConfirmText(e.target.value)}
                        placeholder="Type 'DELETE ALL' in uppercase letters"
                        className="px-3.5 py-2.5 w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none rounded-xl text-xs font-bold text-slate-800 font-mono tracking-wider transition-all placeholder:font-sans placeholder:normal-case placeholder:text-slate-450 placeholder:font-medium"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => {
                          setDeleteConfirmFee(null);
                          setTypedConfirmText('');
                        }}
                        className="flex-1 py-3 bg-white border border-slate-250 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={executeDeleteAllFees}
                        disabled={typedConfirmText !== 'DELETE ALL'}
                        className={`flex-1 py-3 text-white font-heavy text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex justify-center items-center gap-1.5 ${
                          typedConfirmText === 'DELETE ALL'
                            ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-rose-200 hover:shadow-md cursor-pointer font-black'
                            : 'bg-slate-200 text-slate-400 border-none shadow-none cursor-not-allowed font-bold'
                        }`}
                      >
                        <Trash2 size={13} />
                        Delete All Entries
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Delete PTA Fee Setup?</h3>
                      <p className="text-[10px] font-bold uppercase tracking-wider mt-1 text-indigo-600">SINGLE ITEM CLEANUP</p>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2">
                        Are you sure you want to delete the configuration template for this voluntary parent contribution program?
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-slate-400 font-bold">Contribution Program:</span>
                        <span className="text-slate-900 font-black text-right max-w-[180px] truncate" title={deleteConfirmFee.name}>{deleteConfirmFee.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">Configured Target:</span>
                        <span className="text-indigo-700 font-black font-mono">₱{deleteConfirmFee.amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">Target Period:</span>
                        <span className="text-slate-700 font-bold uppercase">{deleteConfirmFee.semester} (SY {deleteConfirmFee.schoolYear})</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setDeleteConfirmFee(null)}
                        className="flex-1 py-3 bg-white border border-slate-250 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => executeDeleteSingleFee(deleteConfirmFee)}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-heavy text-xs uppercase tracking-wider rounded-xl shadow-sm shadow-rose-200 hover:shadow-md transition-all flex justify-center items-center gap-1.5 font-black"
                      >
                        <Trash2 size={13} />
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Clear Audit Logs Confirmation Modal */}
      <AnimatePresence>
        {showClearAuditConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Clear All Audit Logs?</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2">
                    You are about to permanently delete all <strong className="font-extrabold text-slate-800">{auditLogs.length}</strong> audit log entries for your school. This action is permanently IRREVERSIBLE.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowClearAuditConfirm(false)}
                    className="flex-1 py-3 bg-white border border-slate-250 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeClearAuditLogs}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-heavy text-xs uppercase tracking-wider rounded-xl shadow-sm shadow-amber-200 hover:shadow-md transition-all flex justify-center items-center gap-1.5 font-black"
                  >
                    <Trash2 size={13} />
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Clear All Payments Confirmation Modal */}
      <AnimatePresence>
        {showClearAllPaymentsConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Delete ALL Payments?</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2">
                    You are about to permanently delete all <strong className="font-extrabold text-slate-800">{payments.length}</strong> payment records for your school. 
                    <br/><br/>
                    <span className="text-rose-600 font-extrabold">This action effectively resets all O.R. numbers to start from 1 upon the next payment.</span> 
                    <br/><br/>
                    This action is permanently IRREVERSIBLE.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowClearAllPaymentsConfirm(false)}
                    className="flex-1 py-3 bg-white border border-slate-250 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeClearAllPayments}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-heavy text-xs uppercase tracking-wider rounded-xl shadow-sm shadow-rose-200 hover:shadow-md transition-all flex justify-center items-center gap-1.5 font-black"
                  >
                    <Trash2 size={13} />
                    Confirm & Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Void Payment Confirmation Modal */}
      <AnimatePresence>
        {voidConfirmPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Void Payment?</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2">
                    Are you absolutely sure you want to VOID and delete payment of <strong className="font-extrabold text-slate-800">₱{voidConfirmPayment.amountPaid.toLocaleString()}</strong> by <span className="font-bold text-slate-800">{voidConfirmPayment.studentName}</span> logged under <strong className="font-mono bg-slate-100 px-1 rounded text-slate-700">OR-{voidConfirmPayment.orNumber}</strong>? 
                    <br/><br/>
                    This action is permanently IRREVERSIBLE.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setVoidConfirmPayment(null)}
                    className="flex-1 py-3 bg-white border border-slate-250 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeVoidPayment}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-heavy text-xs uppercase tracking-wider rounded-xl shadow-sm shadow-rose-200 hover:shadow-md transition-all flex justify-center items-center gap-1.5 font-black"
                  >
                    <Trash2 size={13} />
                    Confirm & Void
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styled Printable Styles Layer Injector */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-container, #receipt-print-container * {
            visibility: visible;
          }
          #receipt-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none;
            box-shadow: none;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
