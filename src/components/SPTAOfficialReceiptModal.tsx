import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Building2, User, CreditCard, Calendar, Hash } from 'lucide-react';
import { motion } from 'motion/react';
import { PTAPayment, Section, Student, School } from '../types';

interface SPTAOfficialReceiptModalProps {
  payment: PTAPayment;
  student?: Student | null;
  section?: Section | null;
  school?: School | null;
  onClose: () => void;
}

export const SPTAOfficialReceiptModal: React.FC<SPTAOfficialReceiptModalProps> = ({
  payment,
  student,
  section,
  school,
  onClose
}) => {
  const printReceipt = () => {
    const printContent = document.getElementById('spta-official-receipt-print-area')?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the receipt.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official SPTA Receipt - ${payment.orNumber || 'REC-001'}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 10mm;
            }
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              padding: 20px;
              color: #0f172a;
              margin: 0;
              background: #fff;
            }
            .receipt-container {
              border: 2px solid #1e293b;
              padding: 24px;
              border-radius: 12px;
              max-width: 500px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .header h3 {
              margin: 0;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .header h2 {
              margin: 2px 0;
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
            }
            .header h1 {
              margin: 6px 0 0 0;
              font-size: 16px;
              font-weight: 900;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 16px;
              background: #f8fafc;
              padding: 12px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .info-item {
              font-size: 11px;
            }
            .info-label {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              display: block;
              margin-bottom: 2px;
            }
            .info-value {
              font-weight: 700;
              color: #0f172a;
            }
            .amount-box {
              background: #eef2ff;
              border: 1.5px dashed #6366f1;
              border-radius: 8px;
              padding: 12px;
              text-align: center;
              margin-bottom: 20px;
            }
            .amount-label {
              font-size: 10px;
              font-weight: 800;
              color: #4338ca;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .amount-value {
              font-size: 24px;
              font-weight: 900;
              color: #312e81;
              margin-top: 2px;
            }
            .footer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 30px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #0f172a;
              margin-bottom: 4px;
              height: 30px;
            }
            .signature-title {
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
            }
            .signature-name {
              font-size: 11px;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formattedDate = payment.paymentDate 
    ? new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-white">SPTA Official Receipt</h2>
              <p className="text-[10px] text-slate-400 font-mono">OR: {payment.orNumber || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Area Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div id="spta-official-receipt-print-area">
            <div className="receipt-container border-2 border-slate-800 rounded-2xl p-6 bg-white shadow-sm space-y-5">
              
              {/* Header section */}
              <div className="header text-center border-b-2 border-slate-200 pb-4">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Republic of the Philippines</h3>
                <h2 className="text-xs font-black text-slate-900 uppercase">Department of Education</h2>
                <h1 className="text-base font-black text-indigo-600 uppercase tracking-wide mt-1">SPTA Official Receipt</h1>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">School Parents-Teachers Association</p>
              </div>

              {/* Receipt Number & Date Banner */}
              <div className="flex justify-between items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">OR Number</span>
                  <span className="font-mono font-black text-slate-900">{payment.orNumber || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Payment Date</span>
                  <span className="font-semibold text-slate-800">{formattedDate}</span>
                </div>
              </div>

              {/* Learner & Contribution Details Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-4 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block mb-0.5">Learner Name</span>
                  <span className="font-bold text-slate-900 uppercase">{payment.studentName || (student ? `${student.lastName}, ${student.firstName}` : 'N/A')}</span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block mb-0.5">LRN</span>
                  <span className="font-mono font-bold text-slate-900">{payment.lrn || student?.lrn || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block mb-0.5">Grade & Section</span>
                  <span className="font-semibold text-slate-800">{payment.sectionName || section?.name ? `Grade ${payment.gradeLevel || section?.gradeLevel} - ${payment.sectionName || section?.name}` : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block mb-0.5">School Year</span>
                  <span className="font-semibold text-slate-800">SY {payment.schoolYear || section?.schoolYear || 'N/A'}</span>
                </div>
              </div>

              {/* SPTA Contribution Field (Changed from School Name to SPTA Contribution) */}
              <div className="bg-indigo-50/60 p-3.5 border border-indigo-100 rounded-xl space-y-1">
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider block">SPTA Contribution</span>
                <p className="font-black text-slate-900 text-xs uppercase tracking-tight">
                  {payment.feeName || 'SPTA Voluntary School Contribution'}
                </p>
                {payment.remarks && (
                  <p className="text-[10px] text-slate-500 italic mt-1">
                    Remarks: {payment.remarks}
                  </p>
                )}
              </div>

              {/* Amount Box */}
              <div className="bg-emerald-50/80 border-2 border-dashed border-emerald-300 rounded-2xl p-4 text-center">
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest block">Amount Settled</span>
                <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                  ₱{(payment.amountPaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase mt-1">
                  <CheckCircle2 size={11} /> Fully Verified Transaction
                </span>
              </div>

              {/* Signatures Grid (Record Collector changed to SPTA Treasure / SPTA Treasurer) */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-200 text-center">
                <div>
                  <div className="h-8 flex items-end justify-center">
                    <span className="font-bold text-slate-900 text-xs uppercase border-b border-slate-800 px-3 pb-0.5 w-full truncate">
                      {payment.treasurerName || payment.collectorName || 'SPTA Treasurer'}
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mt-1">
                    SPTA Treasure / Treasurer
                  </span>
                </div>
                <div>
                  <div className="h-8 flex items-end justify-center">
                    <span className="font-bold text-slate-900 text-xs uppercase border-b border-slate-800 px-3 pb-0.5 w-full truncate">
                      {section?.adviserName || 'Class Adviser'}
                    </span>
                  </div>
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider block mt-1">
                    Attested By (Adviser)
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">Official DepEd SPTA Record</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Close
            </button>
            <button
              onClick={printReceipt}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Printer size={14} />
              Print Official Receipt
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};
