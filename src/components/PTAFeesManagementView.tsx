import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, Plus, Trash2, Search, Printer, CheckCircle, 
  ShieldCheck, CreditCard, RefreshCw, X, Users,
  Check, FileText, ShieldAlert, AlertCircle, Edit, Sparkles
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, safeGetDocs as getDocs } from '../firebase';
import { User, UserProfile, Section, Student, PTAFee, PTAPayment, PTAAuditLog } from '../types';
import { formatStudentName, printHTMLContent } from '../utils';

interface PTAFeesManagementViewProps {
  currentUser: User | null;
  userProfile: UserProfile | null;
  selectedSection: Section | null;
  sections: Section[];
  initialTab?: string;
}

export function PTAFeesManagementView({
  currentUser,
  userProfile,
  selectedSection,
  sections,
  initialTab = 'collection'
}: PTAFeesManagementViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'collection' | 'setup' | 'logs' | 'audit'>(initialTab as any);
  const [fees, setFees] = useState<PTAFee[]>([]);
  const [payments, setPayments] = useState<PTAPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<PTAAuditLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States
  const [selectedSectionId, setSelectedSectionId] = useState<string>(selectedSection?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(false);

  // Modal States
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<PTAFee | null>(null);
  const [feeForm, setFeeForm] = useState({
    name: '',
    amount: '',
    description: '',
    semester: 'Full Year' as '1st Semester' | '2nd Semester' | 'Full Year',
    isVoluntary: true,
    allowSiblingCoverage: true
  });

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStudentForPay, setSelectedStudentForPay] = useState<Student | null>(null);
  const [payForm, setPayForm] = useState({
    feeId: '',
    amountPaid: '',
    orNumber: '',
    remarks: '',
    coveredBySibling: false,
    siblingPayeeLrn: ''
  });

  const [showReceipt, setShowReceipt] = useState<PTAPayment | null>(null);

  const currentSchoolId = userProfile?.schoolId || 'default_school';
  const currentSchoolYear = selectedSection?.schoolYear || '2024-2025';

  useEffect(() => {
    if (selectedSection?.id) {
      setSelectedSectionId(selectedSection.id);
    } else if (sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id);
    }
  }, [selectedSection, sections]);

  // Load PTA Fees
  useEffect(() => {
    if (!currentSchoolId) return;
    setLoading(true);

    const feesRef = collection(db, 'pta_fees');
    const qFees = query(
      feesRef,
      where('schoolId', '==', currentSchoolId),
      where('status', '==', 'active')
    );

    const unsubFees = onSnapshot(qFees, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PTAFee));
      setFees(list);
    }, (err) => {
      console.error("Error loading PTA fees:", err);
    });

    return () => unsubFees();
  }, [currentSchoolId]);

  // Load PTA Payments
  useEffect(() => {
    if (!currentSchoolId) return;

    const paymentsRef = collection(db, 'pta_payments');
    const qPayments = query(
      paymentsRef,
      where('schoolId', '==', currentSchoolId)
    );

    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PTAPayment));
      setPayments(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading PTA payments:", err);
      setLoading(false);
    });

    return () => unsubPayments();
  }, [currentSchoolId]);

  // Load Audit Logs
  useEffect(() => {
    if (!currentSchoolId) return;

    const auditRef = collection(db, 'pta_audit_logs');
    const qAudit = query(
      auditRef,
      where('schoolId', '==', currentSchoolId),
      orderBy('timestamp', 'desc')
    );

    const unsubAudit = onSnapshot(qAudit, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PTAAuditLog));
      setAuditLogs(list);
    }, (err) => {
      console.error("Error loading PTA audit logs:", err);
    });

    return () => unsubAudit();
  }, [currentSchoolId]);

  // Load Students for Selected Section
  useEffect(() => {
    if (!selectedSectionId) return;

    const studentsRef = collection(db, `sections/${selectedSectionId}/students`);
    const unsubStudents = onSnapshot(studentsRef, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      setStudents(list);
    }, (err) => {
      console.error("Error loading section students:", err);
    });

    return () => unsubStudents();
  }, [selectedSectionId]);

  const activeSectionObj = useMemo(() => {
    return sections.find(s => s.id === selectedSectionId) || selectedSection;
  }, [sections, selectedSectionId, selectedSection]);

  // Save/Update Fee
  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeForm.name || !feeForm.amount) return;

    try {
      if (editingFee) {
        await updateDoc(doc(db, 'pta_fees', editingFee.id), {
          name: feeForm.name,
          amount: parseFloat(feeForm.amount),
          description: feeForm.description,
          semester: feeForm.semester,
          isVoluntary: feeForm.isVoluntary,
          allowSiblingCoverage: feeForm.allowSiblingCoverage,
          updatedAt: new Date().toISOString()
        });

        // Audit Log
        await addDoc(collection(db, 'pta_audit_logs'), {
          actionType: 'fee_setup_update',
          details: `Updated PTA Fee: ${feeForm.name} (₱${feeForm.amount})`,
          performedByEmail: currentUser?.email || 'System',
          performedByName: userProfile?.fullName || 'System User',
          timestamp: new Date().toISOString(),
          schoolId: currentSchoolId
        });
      } else {
        await addDoc(collection(db, 'pta_fees'), {
          name: feeForm.name,
          amount: parseFloat(feeForm.amount),
          description: feeForm.description,
          schoolYear: currentSchoolYear,
          semester: feeForm.semester,
          status: 'active',
          isVoluntary: feeForm.isVoluntary,
          allowSiblingCoverage: feeForm.allowSiblingCoverage,
          createdBy: currentUser?.email || 'System',
          createdAt: new Date().toISOString(),
          schoolId: currentSchoolId
        });

        // Audit Log
        await addDoc(collection(db, 'pta_audit_logs'), {
          actionType: 'fee_setup_create',
          details: `Created New PTA Fee: ${feeForm.name} (₱${feeForm.amount})`,
          performedByEmail: currentUser?.email || 'System',
          performedByName: userProfile?.fullName || 'System User',
          timestamp: new Date().toISOString(),
          schoolId: currentSchoolId
        });
      }

      setShowFeeModal(false);
      setEditingFee(null);
      setFeeForm({
        name: '',
        amount: '',
        description: '',
        semester: 'Full Year',
        isVoluntary: true,
        allowSiblingCoverage: true
      });
    } catch (err) {
      console.error("Error saving fee:", err);
      alert("Failed to save PTA Fee configuration.");
    }
  };

  const handleDeleteFee = async (feeId: string, feeName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${feeName}"?`)) return;
    try {
      await updateDoc(doc(db, 'pta_fees', feeId), { status: 'inactive' });
      await addDoc(collection(db, 'pta_audit_logs'), {
        actionType: 'fee_setup_update',
        details: `Deactivated PTA Fee: ${feeName}`,
        performedByEmail: currentUser?.email || 'System',
        performedByName: userProfile?.fullName || 'System User',
        timestamp: new Date().toISOString(),
        schoolId: currentSchoolId
      });
    } catch (err) {
      console.error("Error deleting fee:", err);
    }
  };

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForPay || !payForm.feeId || (!payForm.amountPaid && !payForm.coveredBySibling)) return;

    const feeObj = fees.find(f => f.id === payForm.feeId);
    if (!feeObj) return;

    try {
      const paymentData: Partial<PTAPayment> = {
        studentId: selectedStudentForPay.id,
        studentName: formatStudentName(selectedStudentForPay),
        lrn: selectedStudentForPay.lrn || 'N/A',
        sectionId: activeSectionObj?.id || selectedSectionId,
        sectionName: activeSectionObj?.name || 'Section',
        gradeLevel: activeSectionObj?.gradeLevel || 0,
        feeId: feeObj.id,
        feeName: feeObj.name,
        amountPaid: payForm.coveredBySibling ? 0 : parseFloat(payForm.amountPaid),
        paymentDate: new Date().toISOString().split('T')[0],
        orNumber: payForm.orNumber || `OR-${Date.now().toString().slice(-6)}`,
        collectorName: userProfile?.fullName || currentUser?.displayName || 'SPTA Treasurer',
        collectorEmail: currentUser?.email || '',
        schoolYear: currentSchoolYear,
        remarks: payForm.remarks,
        coveredBySibling: payForm.coveredBySibling,
        schoolId: currentSchoolId,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'pta_payments'), paymentData);

      // Audit Log
      await addDoc(collection(db, 'pta_audit_logs'), {
        actionType: 'payment_record',
        details: `Recorded payment of ₱${paymentData.amountPaid} for ${paymentData.studentName} (${feeObj.name}, OR: ${paymentData.orNumber})`,
        performedByEmail: currentUser?.email || 'System',
        performedByName: userProfile?.fullName || 'System User',
        timestamp: new Date().toISOString(),
        schoolId: currentSchoolId
      });

      setShowPayModal(false);
      setShowReceipt({ id: docRef.id, ...paymentData } as PTAPayment);
      setSelectedStudentForPay(null);
      setPayForm({
        feeId: '',
        amountPaid: '',
        orNumber: '',
        remarks: '',
        coveredBySibling: false,
        siblingPayeeLrn: ''
      });
    } catch (err) {
      console.error("Error recording payment:", err);
      alert("Failed to record PTA payment.");
    }
  };

  // Void Payment
  const handleVoidPayment = async (payment: PTAPayment) => {
    if (!window.confirm(`Void receipt ${payment.orNumber} for ${payment.studentName}?`)) return;
    try {
      await deleteDoc(doc(db, 'pta_payments', payment.id));
      await addDoc(collection(db, 'pta_audit_logs'), {
        actionType: 'payment_void',
        details: `Voided OR #${payment.orNumber} (₱${payment.amountPaid}) for ${payment.studentName}`,
        performedByEmail: currentUser?.email || 'System',
        performedByName: userProfile?.fullName || 'System User',
        timestamp: new Date().toISOString(),
        schoolId: currentSchoolId
      });
    } catch (err) {
      console.error("Error voiding payment:", err);
    }
  };

  // Print Receipt Handler with requested text: "SPTA Contribution" and "SPTA Treasure"
  const handlePrintReceipt = (payment: PTAPayment) => {
    const receiptHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 100%; margin: 0 auto; color: #111;">
        <div style="text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 20px; margin-bottom: 20px;">
          <div style="font-size: 10px; font-weight: bold; letter-spacing: 2px; color: #666; text-transform: uppercase;">Parent-Teacher Association</div>
          <div style="font-size: 18px; font-weight: 900; margin-top: 5px; text-transform: uppercase;">Official PTA Receipt</div>
          <div style="font-size: 12px; font-weight: bold; color: #333; margin-top: 5px; text-transform: uppercase;">SPTA Contribution</div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px;">
          <div>
            <div style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase;">OR Number</div>
            <div style="font-weight: bold; font-family: monospace; font-size: 14px;">${payment.orNumber}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10px; color: #666; font-weight: bold; text-transform: uppercase;">Payment Date</div>
            <div style="font-weight: bold;">${payment.paymentDate}</div>
          </div>
        </div>
        
        <div style="border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; background: #f9f9f9;">
          <div style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Learner Details (${payment.schoolYear})</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #666;">Full Name:</span>
            <span style="font-weight: bold; text-transform: uppercase;">${payment.studentName}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #666;">LRN:</span>
            <span style="font-family: monospace; font-weight: bold;">${payment.lrn}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #ddd; padding-top: 10px;">
            <div>
              <div style="font-size: 10px; color: #666;">Section</div>
              <div style="font-weight: bold; text-transform: uppercase;">${payment.sectionName}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; color: #666;">Grade Level</div>
              <div style="font-weight: bold; text-transform: uppercase;">Grade ${payment.gradeLevel}</div>
            </div>
          </div>
        </div>
        
        <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
          <div style="padding: 15px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="font-weight: bold;">${payment.feeName}</span>
              <span style="font-weight: bold; font-family: monospace;">PHP ${payment.amountPaid.toFixed(2)}</span>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 15px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Total Received Amount</span>
            <span style="font-size: 16px; font-weight: 900; color: #1e1b4b; font-family: monospace;">PHP ${payment.amountPaid.toFixed(2)}</span>
          </div>
        </div>
        
        <div style="margin-bottom: 30px;">
          <div style="font-size: 10px; font-weight: bold; color: #666; text-transform: uppercase;">SPTA Treasure</div>
          <div style="font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 2px; padding-right: 40px; margin-top: 5px;">${payment.collectorName}</div>
        </div>
        
        <div style="text-align: center; border: 1px solid #e0e7ff; background: #eef2ff; border-radius: 8px; padding: 15px;">
          <div style="font-size: 9px; font-weight: bold; color: #312e81; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">OFFICIAL PTA DISCLOSURE COMPLIANCE</div>
          <div style="font-size: 11px; font-weight: bold; font-style: italic; color: #3730a3; margin-bottom: 5px;">"PTA contributions are voluntary and not mandatory under DepEd policies."</div>
          <div style="font-size: 9px; color: #64748b;">This receipt is proof of voluntary parent support and cannot hinder school enrollment or grade processing.</div>
        </div>
      </div>
    `;

    printHTMLContent(`Official PTA Receipt - ${payment.orNumber}`, receiptHTML);
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const name = formatStudentName(student).toLowerCase();
      const lrn = (student.lrn || '').toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase()) || lrn.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (showOnlyUnpaid && fees.length > 0) {
        // Check if student has unpaid fees
        const studentPayments = payments.filter(p => p.studentId === student.id);
        const hasUnpaid = fees.some(fee => {
          const paid = studentPayments
            .filter(p => p.feeId === fee.id)
            .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
          return paid < fee.amount;
        });
        return hasUnpaid;
      }

      return true;
    });
  }, [students, searchTerm, showOnlyUnpaid, fees, payments]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-400/20">
                School Year {currentSchoolYear}
              </span>
              <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-400/20">
                DepEd Compliant
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              PTA Fees & Voluntary Contributions
            </h1>
            <p className="text-indigo-200 text-xs md:text-sm max-w-2xl font-medium">
              Manage voluntary Parent-Teacher Association contributions, issue official receipt ledgers, and track collections in compliance with DepEd guidelines.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingFee(null);
                setFeeForm({
                  name: '',
                  amount: '',
                  description: '',
                  semester: 'Full Year',
                  isVoluntary: true,
                  allowSiblingCoverage: true
                });
                setShowFeeModal(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 shrink-0"
            >
              <Plus size={16} />
              Setup PTA Fee
            </button>
          </div>
        </div>
      </div>

      {/* DepEd Compliance Notice */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 text-emerald-900 shadow-sm">
        <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={20} />
        <div className="text-xs space-y-1">
          <p className="font-extrabold uppercase tracking-wider text-emerald-950">
            DepEd Order Disclosure Compliance
          </p>
          <p className="font-medium text-emerald-800 leading-relaxed">
            All Parent-Teacher Association (PTA) contributions are strictly <strong>voluntary</strong>. Enrollment, MATATAG assessment reviews, and official report cards (SF9) must never be conditioned or withheld due to non-contribution.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('collection')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'collection'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Coins size={14} />
            Collection Ledger
          </button>
          <button
            onClick={() => setActiveSubTab('setup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'setup'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard size={14} />
            Fee Configurations ({fees.length})
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'logs'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText size={14} />
            Official Receipts ({payments.length})
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'audit'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldAlert size={14} />
            Audit Trail
          </button>
        </div>

        {/* Section Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section:</label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {sections.map(sec => (
              <option key={sec.id} value={sec.id}>
                Grade {sec.gradeLevel} - {sec.name} ({sec.schoolYear})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COLLECTION TAB */}
      {activeSubTab === 'collection' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search learner name or LRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showOnlyUnpaid}
                  onChange={(e) => setShowOnlyUnpaid(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Show Pending Only
              </label>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                    <th className="px-5 py-3.5">Learner Name</th>
                    <th className="px-5 py-3.5">LRN</th>
                    <th className="px-5 py-3.5">Active PTA Fee Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-400 font-bold italic">
                        No students found in this section.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => {
                      const studentPayments = payments.filter(p => p.studentId === student.id);
                      
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900">
                            {formatStudentName(student)}
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-600 font-bold">
                            {student.lrn || 'N/A'}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {fees.length === 0 ? (
                                <span className="text-[10px] text-slate-400 italic">No fees configured</span>
                              ) : (
                                fees.map(fee => {
                                  const feePayments = studentPayments.filter(p => p.feeId === fee.id);
                                  const totalPaid = feePayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                                  const isCoveredBySibling = feePayments.some(p => p.coveredBySibling);
                                  const isSettled = totalPaid >= fee.amount || isCoveredBySibling;

                                  return (
                                    <span
                                      key={fee.id}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                        isCoveredBySibling
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : isSettled
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : totalPaid > 0
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {isSettled ? <CheckCircle size={12} /> : <Coins size={12} />}
                                      {fee.name}: ₱{totalPaid.toFixed(0)} / ₱{fee.amount.toFixed(0)}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedStudentForPay(student);
                                setPayForm({
                                  feeId: fees[0]?.id || '',
                                  amountPaid: fees[0]?.amount ? fees[0].amount.toString() : '',
                                  orNumber: `OR-${Date.now().toString().slice(-6)}`,
                                  remarks: '',
                                  coveredBySibling: false,
                                  siblingPayeeLrn: ''
                                });
                                setShowPayModal(true);
                              }}
                              disabled={fees.length === 0}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-sm disabled:opacity-50"
                            >
                              Record Payment
                            </button>
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

      {/* SETUP TAB */}
      {activeSubTab === 'setup' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Configured PTA Fees ({fees.length})</h3>
            <button
              onClick={() => {
                setEditingFee(null);
                setFeeForm({
                  name: '',
                  amount: '',
                  description: '',
                  semester: 'Full Year',
                  isVoluntary: true,
                  allowSiblingCoverage: true
                });
                setShowFeeModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Fee
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fees.map(fee => (
              <div key={fee.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{fee.name}</h4>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{fee.semester}</span>
                  </div>
                  <span className="text-lg font-black text-slate-900">₱{fee.amount.toFixed(2)}</span>
                </div>

                {fee.description && (
                  <p className="text-xs text-slate-500">{fee.description}</p>
                )}

                <div className="flex items-center gap-2 text-[10px] font-bold">
                  {fee.isVoluntary && (
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded uppercase">Voluntary</span>
                  )}
                  {fee.allowSiblingCoverage && (
                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded uppercase">Sibling Coverage</span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingFee(fee);
                      setFeeForm({
                        name: fee.name,
                        amount: fee.amount.toString(),
                        description: fee.description || '',
                        semester: fee.semester,
                        isVoluntary: fee.isVoluntary,
                        allowSiblingCoverage: fee.allowSiblingCoverage ?? true
                      });
                      setShowFeeModal(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteFee(fee.id, fee.name)}
                    className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OFFICIAL RECEIPTS LOGS TAB */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-800 text-xs">
            Issued Official PTA Receipts
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">OR Number</th>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3">Fee Name</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">SPTA Treasure</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-bold italic">
                      No official receipts issued yet.
                    </td>
                  </tr>
                ) : (
                  payments.map(pay => (
                    <tr key={pay.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 text-slate-600">{pay.paymentDate}</td>
                      <td className="px-5 py-3 font-mono font-bold text-slate-900">{pay.orNumber}</td>
                      <td className="px-5 py-3 font-bold text-slate-800">{pay.studentName}</td>
                      <td className="px-5 py-3 text-slate-700">{pay.feeName}</td>
                      <td className="px-5 py-3 font-black text-indigo-600">₱{pay.amountPaid.toFixed(2)}</td>
                      <td className="px-5 py-3 text-slate-600 font-bold">{pay.collectorName}</td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button
                          onClick={() => setShowReceipt(pay)}
                          className="px-2.5 py-1 bg-slate-900 text-white font-bold text-[10px] rounded hover:bg-slate-800 transition-all"
                        >
                          View Receipt
                        </button>
                        <button
                          onClick={() => handleVoidPayment(pay)}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold text-[10px] rounded hover:bg-rose-100 transition-all border border-rose-200"
                        >
                          Void
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL TAB */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-800 text-xs">
            PTA Transaction Audit Stream
          </div>
          <div className="divide-y divide-slate-100">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-bold italic text-xs">
                No audit logs generated yet.
              </div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{log.details}</p>
                    <p className="text-[10px] text-slate-400">By: {log.performedByName} ({log.performedByEmail})</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FEE SETUP MODAL */}
      {showFeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingFee ? 'Edit PTA Fee' : 'Setup New PTA Fee'}
              </h3>
              <button onClick={() => setShowFeeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFee} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Fee Program Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual PTA Support Fund"
                  value={feeForm.name}
                  onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount (PHP)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Semester</label>
                  <select
                    value={feeForm.semester}
                    onChange={(e) => setFeeForm({ ...feeForm, semester: e.target.value as any })}
                    className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Full Year">Full Year</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Details regarding voluntary program usage..."
                  value={feeForm.description}
                  onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFeeModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-md"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPayModal && selectedStudentForPay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Record PTA Payment</h3>
                <p className="text-[10px] text-slate-500">{formatStudentName(selectedStudentForPay)} (LRN: {selectedStudentForPay.lrn})</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Fee Program</label>
                <select
                  value={payForm.feeId}
                  onChange={(e) => {
                    const selected = fees.find(f => f.id === e.target.value);
                    setPayForm({
                      ...payForm,
                      feeId: e.target.value,
                      amountPaid: selected ? selected.amount.toString() : payForm.amountPaid
                    });
                  }}
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {fees.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (₱{f.amount})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Amount Paid (PHP)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payForm.amountPaid}
                  onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">OR Number</label>
                <input
                  type="text"
                  required
                  value={payForm.orNumber}
                  onChange={(e) => setPayForm({ ...payForm, orNumber: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="Optional notes or receipt details..."
                  value={payForm.remarks}
                  onChange={(e) => setPayForm({ ...payForm, remarks: e.target.value })}
                  className="w-full p-2.5 border rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-md"
                >
                  Issue Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL PTA RECEIPT MODAL (Requested changes applied: SPTA Contribution & SPTA Treasure) */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2">
                <Coins className="text-indigo-400" size={16} />
                <span className="text-xs font-black uppercase tracking-wider font-bold">Official Contribution Receipt</span>
              </div>
              <button 
                onClick={() => setShowReceipt(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-6 flex-1 text-slate-800">
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                <h2 className="text-[10px] font-black tracking-[0.25em] text-slate-400 uppercase">PARENT-TEACHER ASSOCIATION</h2>
                <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase font-black">OFFICIAL VOLUNTARY CONTRIBUTION RECEIPT</h1>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">SPTA Contribution</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">OR Number</span>
                  <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm tracking-wide">{showReceipt.orNumber}</span>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Payment Date</span>
                  <span className="font-bold text-slate-900">{showReceipt.paymentDate}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Learner Details</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-200 rounded">{showReceipt.schoolYear}</span>
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
                  <div>
                    <span className="text-slate-500 font-bold block text-[9px]">SPTA Treasure</span>
                    <span className="text-slate-800 font-bold uppercase truncate max-w-[150px]" title={showReceipt.collectorName}>{showReceipt.collectorName}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between text-[9px] font-black text-slate-400 uppercase">
                  <span>Particulars</span>
                  <span>Amount Paid</span>
                </div>
                <div className="p-4 flex justify-between items-center font-bold">
                  <div>
                    <h4 className="text-slate-900 font-black">{showReceipt.feeName}</h4>
                    <span className="text-[10px] text-slate-400 font-normal">Strictly voluntary parent association fund</span>
                  </div>
                  <span className="font-mono text-slate-900 text-sm font-black">₱{showReceipt.amountPaid.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                onClick={() => setShowReceipt(null)}
                className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg transition-all"
              >
                Close
              </button>
              <button 
                onClick={() => handlePrintReceipt(showReceipt)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Printer size={12} />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
