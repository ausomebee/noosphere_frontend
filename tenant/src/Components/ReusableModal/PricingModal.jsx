import React, { useState } from 'react';
import ReusableModal from './ReusableModal';
import { TextInput, SelectInput } from '../Input/Inputs';
import './ReusableModal.css';
import Button from '../Button/Button';
const clientOptions = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "30", label: "30" },
];

const storageOptions = [
  { value: "1GB", label: "1GB" },
  { value: "2GB", label: "2GB" },
  { value: "5GB", label: "5GB" },
];

const currencyOptions = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

const PricingModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pricePerMonth, setPricePerMonth] = useState('$1,000.00');
  const [pricePerYear, setPricePerYear] = useState('$1,000.00');
  const [clients, setClients] = useState('10');
  const [storage, setStorage] = useState('1GB');
  const [currency, setCurrency] = useState('USD');

  return (
    <>
     
      <Button
    
        label="Open Pricing Modal"
        variant="primary"
        onClick={() => setIsOpen(true)}
      />
      <ReusableModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Pricing"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonColor="#000000"
        secondaryButtonColor="#ffffff"
      >
        <div>
          <div className="form-group">
            <label className="form-label">Price per Month</label>
            <div className="form-row">
              <TextInput
                value={pricePerMonth}
                onChange={(e) => setPricePerMonth(e.target.value)}
              />
              <SelectInput
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={currencyOptions}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Price per Year</label>
            <div className="form-row">
              <TextInput
                value={pricePerYear}
                onChange={(e) => setPricePerYear(e.target.value)}
              />
              <SelectInput
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={currencyOptions}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">For</label>
            <div className="form-row">
              <SelectInput
                value={clients}
                onChange={(e) => setClients(e.target.value)}
                options={clientOptions}
              />
              <SelectInput
                value={clients}
                onChange={(e) => setClients(e.target.value)}
                options={[{ value: 'Clients', label: 'Clients' }]}
              />
              <SelectInput
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                options={storageOptions}
              />
              <span>of Storage</span>
            </div>
          </div>
        </div>
      </ReusableModal>
    </>
  );
};

export default PricingModal;