import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';

export function CurrencyInput({ value, onValueChange, className, placeholder, required, id }) {
  const [displayValue, setDisplayValue] = useState('');

  // Atualiza o display interno quando o prop value mudar (útil para edição)
  useEffect(() => {
    // Trata null, undefined, ou vazio. Trata caso de formatação em que o value muda.
    if (value !== undefined && value !== null && value !== '') {
      // Impede re-render desnecessário se o valor digitado formatado for o mesmo do value do pai
      const formatted = formatCurrency(Number(value));
      setDisplayValue(formatted);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // Remove tudo que não for dígito
    const onlyDigits = inputValue.replace(/\D/g, '');
    
    if (onlyDigits === '') {
      setDisplayValue('');
      onValueChange(''); 
      return;
    }

    // Converte os dígitos para número dividindo por 100
    // Ex: "1" -> 0.01 | "123" -> 1.23
    const numericValue = parseInt(onlyDigits, 10) / 100;
    
    setDisplayValue(formatCurrency(numericValue));
    onValueChange(numericValue);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      className={className}
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder || 'R$ 0,00'}
      required={required}
    />
  );
}
