import React, { useEffect, useState } from 'react';

export const VoucherCopy = ({ data, title, settings }) => {
  return (
    <div className="h-[140mm] relative text-sm font-sans mx-4 flex flex-col pt-4">
      {/* Title Tag */}
      <div className="absolute top-0 right-0 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] border border-gray-300 px-3 py-1 rounded-sm bg-gray-50/50">
        {title}
      </div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 border-b-2 border-gray-800 pb-3">
        <div className="flex items-center gap-4">
          {settings.logoUrl && (
            <div className="h-14 w-14 flex items-center justify-center overflow-hidden">
                <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain grayscale" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-gray-900 leading-none">
              {settings.headerTitle || data.company_name}
            </h1>
            {(settings.addressLine1 || settings.addressLine2) ? (
              <div className="text-gray-600 text-[10px] mt-1 font-medium tracking-wide leading-tight">
                {settings.addressLine1 && <div>{settings.addressLine1}</div>}
                {settings.addressLine2 && <div>{settings.addressLine2}</div>}
              </div>
            ) : (
              <div className="text-gray-500 text-[10px] mt-1 font-bold tracking-widest uppercase">Check Disbursement Voucher</div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Voucher No.</div>
          <div className="text-lg font-mono font-bold text-gray-900 border border-gray-800 px-3 py-0.5 rounded-sm bg-gray-50 inline-block min-w-[100px] text-center">
            {data.voucher_no}
          </div>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Date */}
        <div className="col-span-3">
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Date</span>
          <div className="border-b border-gray-300 py-1 font-semibold text-gray-900 text-sm">
             {data.date ? new Date(data.date).toLocaleDateString() : '-'}
          </div>
        </div>
        
        {/* Payee (Moves here for better flow) */}
        <div className="col-span-9">
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Pay To</span>
          <div className="border-b border-gray-300 py-1 font-bold text-gray-900 text-sm truncate uppercase">
            {data.payee}
          </div>
        </div>

        {/* Amount in Words */}
        <div className="col-span-9">
          <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">The Sum of</span>
          <div className="border-b border-gray-300 py-1 italic text-xs font-semibold text-gray-700 bg-gray-50/30 px-2 rounded-t min-h-[24px]">
             {data.amount_in_words}
          </div>
        </div>

        {/* Amount Box */}
        <div className="col-span-3">
             <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Amount</span>
             <div className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-sm text-right">
                <span className="text-sm font-bold text-gray-900 font-mono">
                    <span className="text-xs mr-1 text-gray-500">₱</span>
                    {new Intl.NumberFormat('en-PH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.amount)}
                </span>
             </div>
        </div>
      </div>

      {/* Particulars Section */}
      <div className="flex-grow flex flex-col mb-4">
        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Particulars</div>
        <div className="border border-gray-300 flex-grow rounded-sm relative overflow-hidden bg-white p-2">
           {/* Lines */}
           <div className="absolute inset-0 z-0 pointer-events-none" style={{
               background: 'linear-gradient(transparent 95%, #e5e7eb 95%)',
               backgroundSize: '100% 20px',
               marginTop: '22px'
           }}></div>
           <p className="relative z-10 text-xs text-gray-800 whitespace-pre-wrap leading-[20px] font-medium pl-1">
               {data.description}
           </p>
        </div>
      </div>

      {/* Bank & Check Details (Compact) */}
      <div className="flex border border-gray-200 rounded-sm overflow-hidden mb-4 text-xs h-16">
         {/* Payment Type */}
         <div className="w-24 bg-gray-50 border-r border-gray-200 p-2 flex flex-col justify-center items-center">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</span>
            <span className="font-bold text-gray-800 uppercase">{data.payment_type}</span>
         </div>
         
         {/* Bank Info */}
         <div className="flex-1 p-2 flex flex-col justify-center border-r border-gray-200">
             <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Bank</span>
             <span className="font-semibold text-gray-900 truncate">{data.bank_name || 'N/A'}</span>
         </div>

         {/* Check No */}
         <div className="w-32 p-2 flex flex-col justify-center border-r border-gray-200">
             <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Check No.</span>
             <span className="font-mono font-bold text-gray-900">{data.check_no || 'N/A'}</span>
         </div>

         {/* Check Date (PDC/Issued) */}
         <div className="w-28 p-2 flex flex-col justify-center">
             <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Check Date</span>
             <span className="font-semibold text-gray-900">
                 {data.check_date ? new Date(data.check_date).toLocaleDateString() : (data.check_issued_date ? new Date(data.check_issued_date).toLocaleDateString() : '-')}
             </span>
         </div>
      </div>

      {/* Signatories */}
      <div className="grid grid-cols-4 gap-4 mt-auto">
         <div className="text-center">
             <div className="border-b border-gray-800 h-8 mb-1 relative">
                 <span className="absolute bottom-0 left-0 w-full text-xs font-bold truncate">{data.created_by_name || data.created_by_user}</span>
             </div>
             <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{settings.preparedByLabel || 'Prepared By'}</div>
         </div>
         <div className="text-center">
             <div className="border-b border-gray-800 h-8 mb-1 relative">
                 <span className="absolute bottom-0 left-0 w-full text-xs font-bold truncate">{data.certified_by}</span>
             </div>
             <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{settings.checkedByLabel || 'Certified By'}</div>
         </div>
         <div className="text-center">
             <div className="border-b border-gray-800 h-8 mb-1 relative">
                 <span className="absolute bottom-0 left-0 w-full text-xs font-bold truncate">
                    {data.approved_by || (data.approval_attachment ? 'See Attachment' : '')}
                 </span>
             </div>
             <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{settings.approvedByLabel || 'Approved By'}</div>
         </div>
         <div className="text-center">
             <div className="border-b border-gray-800 h-8 mb-1 relative flex items-end justify-center">
                  <span className="text-xs font-bold truncate">{data.received_by}</span>
             </div>
             <div className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">{settings.receivedByLabel || 'Received By'}</div>
             <div className="text-[8px] text-gray-400 mt-0.5">Signature & Date</div>
         </div>
      </div>
    </div>
  );
};

const VoucherTemplate = React.forwardRef(({ data, settings: propSettings }, ref) => {
  const [localSettings, setLocalSettings] = useState({
    marginTop: '0',
    marginLeft: '0',
    scale: '100',
    showPreparedBy: true,
    headerTitle: '',
    logoUrl: '',
    addressLine1: '',
    addressLine2: '',
    preparedByLabel: 'Prepared By',
    checkedByLabel: 'Certified By',
    approvedByLabel: 'Approved By',
    receivedByLabel: 'Received By'
  });

  useEffect(() => {
    if (!propSettings) {
      const savedSettings = localStorage.getItem('voucher_print_settings');
      if (savedSettings) {
        setLocalSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    }
  }, [propSettings]);

  const settings = propSettings || localSettings;

  if (!data) return null;

  // Print style setup
  // We use standard Long Bond (8.5 x 13 in) Approx 215.9mm x 330.2mm
  // Or A4 (210mm x 297mm). Most vouchers on full paper use two halves.
  // Standardizing container.
  
  const containerStyle = {
    paddingTop: `${settings.marginTop}mm`,
    paddingLeft: `${settings.marginLeft}mm`,
    transform: `scale(${settings.scale / 100})`,
    transformOrigin: 'top left',
  };

  return (
    <div ref={ref} className="bg-white w-[8.5in] min-h-[11in] mx-auto relative shadow-2xl printable-area overflow-hidden" style={containerStyle}>
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 0; }
          body { -webkit-print-color-adjust: exact; }
          .printable-area { box-shadow: none !important; margin: 0 !important; width: 8.5in !important; height: 11in !important; }
        `}
      </style>
      
      {/* Top Half - Payee's Copy (Approx 5.5in height) */}
      <div className="absolute top-0 left-0 w-full h-[50%] p-8 box-border">
        <VoucherCopy data={data} title="PAYEE'S COPY" settings={settings} />
      </div>

      {/* Cut Line */}
      <div className="absolute top-1/2 left-0 w-full flex items-center justify-center z-10 -mt-2">
          <div className="w-full border-t border-dashed border-gray-400 mx-8"></div>
          <span className="absolute bg-white px-2 text-gray-400 text-[8px] font-bold tracking-widest uppercase flex items-center gap-1">
            <span>✂</span> Cut Here 
          </span>
      </div>

      {/* Bottom Half - File Copy */}
      <div className="absolute top-[50%] left-0 w-full h-[50%] p-8 box-border">
        <VoucherCopy data={data} title="FILE COPY" settings={settings} />
      </div>
    </div>
  );
});

export default VoucherTemplate;

