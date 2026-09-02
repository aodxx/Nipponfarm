import React, { useState } from 'react';
import { Delete, RotateCcw, Copy, Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Calculator() {
  const navigate = useNavigate();
  const [currentValue, setCurrentValue] = useState('0');
  const [previousValue, setPreviousValue] = useState('');
  const [operator, setOperator] = useState('');
  const [history, setHistory] = useState<{ equation: string; result: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const handleNumber = (num: string) => {
    if (currentValue === '0' || currentValue === 'Error') {
      setCurrentValue(num);
    } else {
      // Prevent multiple decimals
      if (num === '.' && currentValue.includes('.')) return;
      setCurrentValue(currentValue + num);
    }
  };

  const handleOperator = (op: string) => {
    if (currentValue === 'Error') return;

    if (previousValue && currentValue !== '') {
      calculate();
    }
    
    // If it's just zero and no previous value, allow setting the starting number to a negative
    if (currentValue === '0' && previousValue === '' && op === '-') {
      setCurrentValue('-');
      return;
    }

    setOperator(op);
    setPreviousValue(currentValue || previousValue);
    setCurrentValue('');
  };

  const calculate = () => {
    if (!previousValue || !currentValue || !operator) return;

    const prev = parseFloat(previousValue);
    const current = parseFloat(currentValue);
    let result = 0;

    switch (operator) {
      case '+': result = prev + current; break;
      case '-': result = prev - current; break;
      case '×': result = prev * current; break;
      case '÷': 
        if (current === 0) {
          setCurrentValue('Error');
          setPreviousValue('');
          setOperator('');
          return;
        }
        result = prev / current; 
        break;
      default: return;
    }

    // Format result to avoid lengthy floating point errors, then convert back to string
    const stringResult = parseFloat(result.toFixed(8)).toString();
    
    const equation = `${previousValue} ${operator} ${currentValue} =`;
    
    setHistory(prevHist => [{ equation, result: stringResult }, ...prevHist].slice(0, 10)); // Keep last 10
    
    setCurrentValue(stringResult);
    setPreviousValue('');
    setOperator('');
  };

  const handleClear = () => {
    setCurrentValue('0');
    setPreviousValue('');
    setOperator('');
  };

  const handleDelete = () => {
    if (currentValue === 'Error') {
      handleClear();
      return;
    }
    if (currentValue.length > 1) {
      setCurrentValue(currentValue.slice(0, -1));
    } else {
      setCurrentValue('0');
    }
  };

  const handleCopy = () => {
    if (currentValue && currentValue !== 'Error') {
      navigator.clipboard.writeText(currentValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const Button = ({ 
    label, 
    onClick, 
    type = 'default', 
    colSpan = 1 
  }: { 
    label: string | React.ReactNode, 
    onClick: () => void, 
    type?: 'default' | 'operator' | 'action' | 'equals',
    colSpan?: number
  }) => {
    const baseClass = "h-16 rounded-2xl flex items-center justify-center text-2xl font-medium active:scale-95 transition-transform select-none";
    
    let typeClass = "";
    switch(type) {
      case 'default':
        typeClass = "bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-white/15";
        break;
      case 'operator':
        typeClass = "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-200 dark:hover:bg-amber-500/30";
        break;
      case 'action':
        typeClass = "bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-white/30";
        break;
      case 'equals':
        typeClass = "bg-emerald-500 dark:bg-emerald-600 text-white font-bold hover:bg-emerald-600 dark:hover:bg-emerald-700 shadow-md";
        break;
    }

    return (
      <button 
        onClick={onClick} 
        className={`${baseClass} ${typeClass} ${colSpan === 2 ? 'col-span-2' : ''}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="max-w-md mx-auto p-4 content-area pb-32 animate-in fade-in duration-300">
      
      {/* Top Navigation */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/')}
          className="group flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-905 hover:bg-slate-200/80 dark:hover:text-white bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-2xl border border-slate-200/50 dark:border-white/5 transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#00bcd4] group-hover:-translate-x-0.5 transition-transform" />
          <span>กลับหน้าหลัก (Dashboard)</span>
        </button>
      </div>

      {/* Detail Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">เครื่องคิดเลข</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setHistory([])}
            className="p-2 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
            title="ล้างประวัติ"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-[#f0f4f8] dark:bg-[#0a2e36]/40 p-5 rounded-3xl shadow-xl border border-gray-200 dark:border-white/10 mb-8 backdrop-blur-md">
        
        {/* Display */}
        <div className="bg-white dark:bg-[#041a1f] rounded-2xl p-4 mb-6 shadow-inner text-right min-h-[100px] flex flex-col justify-end relative overflow-hidden group">
          <button 
            onClick={handleCopy}
            className="absolute top-3 left-3 p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/40 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
            title="คัดลอกผลลัพธ์"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          <div className="text-slate-400 dark:text-white/50 text-sm h-5 mb-1 font-mono">
            {previousValue} {operator} {operator && currentValue ? currentValue : ''}
          </div>
          <div className={`text-4xl font-bold tracking-tight font-mono ${currentValue === 'Error' ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
            {currentValue || '0'}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-3">
          {/* Row 1 */}
          <Button label="C" onClick={handleClear} type="action" />
          <Button label={<Delete className="w-6 h-6" />} onClick={handleDelete} type="action" />
          <Button label="%" onClick={() => handleOperator('÷100')} type="action" /> {/* Simple percent logic could be added, leaving as placeholder or implementing specific % toggle */}
          <Button label="÷" onClick={() => handleOperator('÷')} type="operator" />

          {/* Row 2 */}
          <Button label="7" onClick={() => handleNumber('7')} />
          <Button label="8" onClick={() => handleNumber('8')} />
          <Button label="9" onClick={() => handleNumber('9')} />
          <Button label="×" onClick={() => handleOperator('×')} type="operator" />

          {/* Row 3 */}
          <Button label="4" onClick={() => handleNumber('4')} />
          <Button label="5" onClick={() => handleNumber('5')} />
          <Button label="6" onClick={() => handleNumber('6')} />
          <Button label="-" onClick={() => handleOperator('-')} type="operator" />

          {/* Row 4 */}
          <Button label="1" onClick={() => handleNumber('1')} />
          <Button label="2" onClick={() => handleNumber('2')} />
          <Button label="3" onClick={() => handleNumber('3')} />
          <Button label="+" onClick={() => handleOperator('+')} type="operator" />

          {/* Row 5 */}
          <Button label="0" onClick={() => handleNumber('0')} colSpan={2} />
          <Button label="." onClick={() => handleNumber('.')} />
          <Button label="=" onClick={calculate} type="equals" />
        </div>
      </div>

      {/* History Tape */}
      {history.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <h3 className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-3 px-2">ประวัติการคำนวณ</h3>
          <div className="space-y-2">
            {history.map((item, idx) => (
              <div key={idx} className="bg-white/60 dark:bg-white/5 rounded-xl p-3 px-4 flex justify-between items-center text-sm border border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-white/50 font-mono text-xs">{item.equation}</span>
                <span className="font-bold text-slate-800 dark:text-white font-mono">{item.result}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
}
