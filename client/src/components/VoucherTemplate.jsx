import React, { useEffect, useState } from 'react';

export const VoucherCopy = ({ data, title, settings }) => {
  return (
    <div className="border-2 border-gray-900 p-8 h-[140mm] relative text-sm bg-white font-sans mx-4">
      <div className="absolute top-6 right-6 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] border border-gray-300 px-3 py-1 rounded-full">{title}</div>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-gray-900 pb-4">
        <div className="flex items-center gap-5">
          {settings.logoUrl && (
            <img src={settings.logoUrl} alt="Logo" className="h-16 w-auto object-contain grayscale contrast-125" />
          )}
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none">
              {settings.headerTitle || data.company_name}
            </h1>
            {(settings.addressLine1 || settings.addressLine2) ? (
              <div className="text-gray-500 text-xs mt-1.5 font-medium tracking-wide">
                {settings.addressLine1 && <div>{settings.addressLine1}</div>}
                {settings.addressLine2 && <div>{settings.addressLine2}</div>}
              </div>
            ) : (
              <p className="text-gray-500 text-xs mt-1.5 font-medium tracking-wide uppercase">Official Payment Voucher</p>
            )}
          </div>
        </div>
        <div className="text-right pt-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Voucher No.</div>
          <div className="text-xl font-mono font-bold text-gray-900 border-2 border-gray-900 px-4 py-1 rounded-md inline-block bg-gray-50">
            {data.voucher_no}
          </div>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-12 gap-x-6 gap-y-4 mb-6">
        {/* Date */}
        <div className="col-span-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</span>
            <div className="border-b border-gray-300 py-1 font-semibold text-gray-900 text-base">{data.date}</div>
          </div>
        </div>
        
        {/* Amount Box */}
        <div className="col-span-8 flex justify-end items-end">
          <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg flex items-center gap-3 min-w-[200px] shadow-sm">
            <span className="font-bold text-gray-400 text-xs uppercase tracking-wider">Amount</span>
            <span className="text-xl font-bold text-gray-900 font-mono ml-auto">
              <span className="text-base mr-1">₱</span>
              {new Intl.NumberFormat('en-PH', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(data.amount)}
            </span>
          </div>
        </div>

        {/* Payee */}
        <div className="col-span-12">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pay To</span>
            <div className="border-b border-gray-300 py-1 text-lg font-bold text-gray-900">{data.payee}</div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="col-span-12">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">The Sum of</span>
            <div className="border-b border-gray-300 py-1 italic text-sm font-medium text-gray-700 bg-gray-50/50 px-2 rounded-t">
              {data.amount_in_words}
            </div>
          </div>
        </div>
      </div>

      {/* Particulars */}
      <div className="mb-6">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Particulars / Description</div>
        <div className="border border-gray-200 h-32 p-3 rounded-lg bg-white text-gray-800 whitespace-pre-wrap text-sm relative overflow-hidden">
          {/* Ruled Lines Background */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'linear-gradient(transparent 23px, #000 24px)',
            backgroundSize: '100% 24px',
            marginTop: '4px'
          }}></div>
          <div className="relative z-10 leading-[24px]">{data.description}</div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="flex gap-6 mb-6 text-xs">
        <div className="border border-gray-200 p-3 rounded-lg w-1/2 bg-gray-50/50">
          <div className="font-bold mb-2 text-gray-900 uppercase text-[10px] tracking-wider">Payment Mode</div>
          <div className="flex gap-6">
            <label className="flex items-center cursor-default group">
              <div className={`w-4 h-4 border border-gray-400 rounded-full mr-2 flex items-center justify-center transition-colors ${data.payment_type === 'Encashment' ? 'border-gray-900 bg-gray-900' : 'bg-white'}`}>
                {data.payment_type === 'Encashment' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </div>
              <span className="font-medium text-gray-700">Encashment</span>
            </label>
            <label className="flex items-center cursor-default group">
              <div className={`w-4 h-4 border border-gray-400 rounded-full mr-2 flex items-center justify-center transition-colors ${data.payment_type === 'Check' ? 'border-gray-900 bg-gray-900' : 'bg-white'}`}>
                {data.payment_type === 'Check' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </div>
              <span className="font-medium text-gray-700">Check</span>
            </label>
          </div>
        </div>
        
        {(data.payment_type === 'Check' || data.payment_type === 'Encashment') && (
          <div className="border border-gray-200 p-3 rounded-lg w-1/2 bg-gray-50/50">
            <div className="font-bold mb-2 text-gray-900 uppercase text-[10px] tracking-wider">Check Details</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-gray-400 block text-[9px] uppercase tracking-wide">Bank Name</span>
                <span className="font-semibold text-gray-900">{data.bank_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[9px] uppercase tracking-wide">Check No.</span>
                <span className="font-mono font-semibold text-gray-900">{data.check_no}</span>
              </div>
              {data.check_date && (
                <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                  <span className="text-gray-400 block text-[9px] uppercase tracking-wide">Check Date (PDC)</span>
                  <span className="font-semibold text-gray-900">{data.check_date}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div className="flex justify-between mt-auto pt-4 text-center text-xs gap-4">
        {/* Prepared By */}
        <div className="w-1/4">
          <div className="border-b border-gray-900 mb-2 pb-1 font-bold text-gray-900 truncate h-6 relative">
             <span className="absolute bottom-1 left-0 w-full">{data.created_by_name || data.created_by_user || ''}</span>
          </div>
          <div className="text-gray-400 uppercase tracking-widest text-[9px] font-bold">{settings.preparedByLabel || 'Prepared By'}</div>
        </div>

        {/* Certified By */}
        <div className="w-1/4">
          <div className="border-b border-gray-900 mb-2 pb-1 font-bold text-gray-900 truncate h-6 relative">
              <span className="absolute bottom-1 left-0 w-full">{data.certified_by || ''}</span>
          </div>
          <div className="text-gray-400 uppercase tracking-widest text-[9px] font-bold">Certified By</div>
        </div>

        {/* Approved By */}
        <div className="w-1/4">
          <div className="border-b border-gray-900 mb-2 pb-1 font-bold text-gray-900 truncate h-6 relative">
             <span className="absolute bottom-1 left-0 w-full">
               {data.approved_by || (data.approval_attachment ? 'See Attachment' : '')}
             </span>
          </div>
          <div className="text-gray-400 uppercase tracking-widest text-[9px] font-bold">{settings.approvedByLabel || 'Approved By'}</div>
        </div>

        {/* Received By */}
        <div className="w-1/4">
          <div className="border-b border-gray-900 mb-2 pb-1 font-bold text-gray-900 truncate h-6 relative">
              <span className="absolute bottom-1 left-0 w-full">{data.received_by || ''}</span>
          </div>
          <div className="text-gray-400 uppercase tracking-widest text-[9px] font-bold">{settings.receivedByLabel || 'Received By'}</div>
          <div className="flex justify-center mt-1 items-center">
             <span className="text-[8px] text-gray-400 mr-1 uppercase tracking-wide">Date</span>
             <div className="border-b border-gray-300 w-12"></div>
          </div>
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
    checkedByLabel: 'Checked By',
    approvedByLabel: 'Approved By',
    checkIssuedByLabel: 'Check Issued By',
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

  const containerStyle = {
    paddingTop: `${settings.marginTop}mm`,
    paddingLeft: `${settings.marginLeft}mm`,
    transform: `scale(${settings.scale / 100})`,
    transformOrigin: 'top left',
    width: '100%'
  };

  return (
    <div ref={ref} className="bg-white w-[216mm] mx-auto h-[330mm] relative" style={containerStyle}>
      <style type="text/css" media="print">
        {`@page { size: 8.5in 13in; margin: 0; }`}
      </style>
      
      {/* Top Half - Payee's Copy */}
      <div className="absolute top-0 left-0 w-full h-1/2 pt-6">
        <VoucherCopy data={data} title="PAYEE'S COPY" settings={settings} />
      </div>

      {/* Cut Line - Exactly at Center */}
      <div className="absolute top-1/2 left-0 w-full flex items-center justify-center -mt-[1px] z-10">
          <div className="w-full border-t-2 border-dashed border-gray-300"></div>
          <span className="absolute bg-white px-3 text-gray-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
            <span className="text-lg leading-none">✂</span> Cut Here
          </span>
      </div>

      {/* Bottom Half - File Copy */}
      <div className="absolute top-1/2 left-0 w-full h-1/2 pt-6">
        <VoucherCopy data={data} title="FILE COPY" settings={settings} />
      </div>
    </div>
  );
});

export default VoucherTemplate;
