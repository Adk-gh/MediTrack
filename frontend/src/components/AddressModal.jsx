// frontend/src/components/AddressModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// PSGC API Base URL
const PSGC_API = 'https://psgc.cloud/api';

const COUNTRIES = [
  'Philippines',
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Japan',
  'South Korea',
  'China',
  'Singapore',
  'Malaysia',
  'Indonesia',
  'Other'
];

// Fallback generic barangays (used as placeholder)
const GENERIC_BARANGAYS = [
  'Poblacion', 'Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5',
  'San Antonio', 'San Jose', 'San Roque', 'Santa Cruz', 'Santo Nino', 'Mabini',
  'Bulacao', 'Lahug', 'Parian', 'Kamuning', 'Vasra'
];

const inputCls = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] outline-none focus:border-[#4a635d] bg-white transition-colors";
const selectCls = "w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] bg-white outline-none focus:border-[#4a635d] transition-colors";
const labelCls = "block text-[11px] font-bold text-[#64748b] uppercase mb-[4px] ml-[2px]";

export default function AddressModal({ isOpen, onClose, onConfirm, initialData = {}, zIndex = 200 }) {
  const [formData, setFormData] = useState({
    addressCountry: initialData.addressCountry || 'Philippines',
    addressRegion: initialData.addressRegion || '',
    addressRegionCode: initialData.addressRegionCode || '',
    addressProvince: initialData.addressProvince || '',
    addressProvinceCode: initialData.addressProvinceCode || '',
    addressCity: initialData.addressCity || '',
    addressCityCode: initialData.addressCityCode || '',
    addressBarangay: initialData.addressBarangay || '',
    addressBarangayCode: initialData.addressBarangayCode || '',
    addressStreet: initialData.addressStreet || '',
    addressZipCode: initialData.addressZipCode || '',
  });

  // Data states
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Loading states
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  // Fetch regions on mount
  useEffect(() => {
    if (isOpen && regions.length === 0) {
      fetchRegions();
    }
  }, [isOpen]);

  // Reset form data when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        addressCountry: initialData.addressCountry || 'Philippines',
        addressRegion: initialData.addressRegion || '',
        addressRegionCode: initialData.addressRegionCode || '',
        addressProvince: initialData.addressProvince || '',
        addressProvinceCode: initialData.addressProvinceCode || '',
        addressCity: initialData.addressCity || '',
        addressCityCode: initialData.addressCityCode || '',
        addressBarangay: initialData.addressBarangay || '',
        addressBarangayCode: initialData.addressBarangayCode || '',
        addressStreet: initialData.addressStreet || '',
        addressZipCode: initialData.addressZipCode || '',
      });
      // Reset all dependent data
      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }
  }, [isOpen, initialData]);

  const fetchRegions = async () => {
    setLoadingRegions(true);
    try {
      const response = await fetch(`${PSGC_API}/regions`);
      const data = await response.json();
      // Sort alphabetically
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setRegions(sorted);
    } catch (error) {
      console.error('Error fetching regions:', error);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchProvinces = async (regionCode) => {
    setLoadingProvinces(true);
    try {
      const response = await fetch(`${PSGC_API}/regions/${regionCode}/provinces`);
      const data = await response.json();
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setProvinces(sorted);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchCities = async (provinceCode) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`${PSGC_API}/provinces/${provinceCode}/cities-municipalities`);
      const data = await response.json();
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setCities(sorted);
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchBarangays = async (cityCode) => {
    setLoadingBarangays(true);
    try {
      const response = await fetch(`${PSGC_API}/cities-municipalities/${cityCode}/barangays`);
      const data = await response.json();
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setBarangays(sorted);
    } catch (error) {
      console.error('Error fetching barangays:', error);
      // Fallback to generic barangays
      setBarangays(GENERIC_BARANGAYS.map(name => ({ code: '', name })));
    } finally {
      setLoadingBarangays(false);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    let updatedData = { [id]: value };

    // When region changes
    if (id === 'addressRegion') {
      const selectedRegion = regions.find(r => r.name === value);
      updatedData.addressRegionCode = selectedRegion?.code || '';
      updatedData.addressProvince = '';
      updatedData.addressProvinceCode = '';
      updatedData.addressCity = '';
      updatedData.addressCityCode = '';
      updatedData.addressBarangay = '';
      updatedData.addressBarangayCode = '';
      // Reset dependent data
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      // Fetch provinces
      if (selectedRegion?.code) {
        fetchProvinces(selectedRegion.code);
      }
    }

    // When province changes
    if (id === 'addressProvince') {
      const selectedProvince = provinces.find(p => p.name === value);
      updatedData.addressProvinceCode = selectedProvince?.code || '';
      updatedData.addressCity = '';
      updatedData.addressCityCode = '';
      updatedData.addressBarangay = '';
      updatedData.addressBarangayCode = '';
      // Reset dependent data
      setCities([]);
      setBarangays([]);
      // Fetch cities
      if (selectedProvince?.code) {
        fetchCities(selectedProvince.code);
      }
    }

    // When city changes
    if (id === 'addressCity') {
      const selectedCity = cities.find(c => c.name === value);
      updatedData.addressCityCode = selectedCity?.code || '';
      updatedData.addressBarangay = '';
      updatedData.addressBarangayCode = '';
      // Reset dependent data
      setBarangays([]);
      // Fetch barangays
      if (selectedCity?.code) {
        fetchBarangays(selectedCity.code);
      }
    }

    // When barangay is selected
    if (id === 'addressBarangay') {
      const selectedBarangay = barangays.find(b => b.name === value);
      updatedData.addressBarangayCode = selectedBarangay?.code || '';
    }

    setFormData(prev => {
      const newData = { ...prev, ...updatedData };
      return newData;
    });
  };

  const handleConfirm = () => {
    const fullAddress = buildFullAddress(formData);
    onConfirm({
      ...formData,
      homeAddress: fullAddress
    });
    onClose();
  };

  const buildFullAddress = (data) => {
    const parts = [];
    if (data.addressStreet) parts.push(data.addressStreet);
    if (data.addressBarangay) {
      const brgy = data.addressBarangay;
      const formattedBrgy = brgy.toLowerCase().startsWith('barangay ') ? brgy : `Barangay ${brgy}`;
      parts.push(formattedBrgy);
    }
    if (data.addressCity) parts.push(data.addressCity);
    if (data.addressProvince) parts.push(data.addressProvince);
    if (data.addressRegion) parts.push(data.addressRegion);
    if (data.addressCountry) parts.push(data.addressCountry);
    if (data.addressZipCode) parts.push(data.addressZipCode);
    return parts.join(', ');
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1a2e22]">Enter Address</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Country */}
          <div className="mb-4">
            <label className={labelCls}>Country</label>
            <select
              id="addressCountry"
              className={selectCls}
              value={formData.addressCountry}
              onChange={handleChange}
            >
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* For Other Countries - Simple Address */}
          {formData.addressCountry !== 'Philippines' && (
            <div className="mb-4">
              <label className={labelCls}>Address</label>
              <input
                id="addressStreet"
                type="text"
                placeholder="Street Address, City, State/Province, Country"
                className={inputCls}
                value={formData.addressStreet}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Philippines Address Fields */}
          {formData.addressCountry === 'Philippines' && (
          <>
          <div className="mb-3">
            <label className={labelCls}>Region</label>
            <select
              id="addressRegion"
              className={selectCls}
              value={formData.addressRegion}
              onChange={handleChange}
              disabled={loadingRegions}
            >
              <option value="" disabled>{loadingRegions ? 'Loading...' : 'Select Region'}</option>
              {regions.map(r => (
                <option key={r.code} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Province */}
          <div className="mb-3">
            <label className={labelCls}>Province</label>
            <select
              id="addressProvince"
              className={selectCls}
              value={formData.addressProvince}
              onChange={handleChange}
              disabled={!formData.addressRegion || loadingProvinces}
            >
              <option value="" disabled>{loadingProvinces ? 'Loading...' : 'Select Province'}</option>
              {provinces.map(p => (
                <option key={p.code} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* City/Municipality */}
          <div className="mb-3">
            <label className={labelCls}>City/Municipality</label>
            <select
              id="addressCity"
              className={selectCls}
              value={formData.addressCity}
              onChange={handleChange}
              disabled={!formData.addressProvince || loadingCities}
            >
              <option value="" disabled>{loadingCities ? 'Loading...' : 'Select City/Municipality'}</option>
              {cities.map(c => (
                <option key={c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Barangay - Dropdown */}
          <div className="mb-3">
            <label className={labelCls}>Barangay</label>
            <select
              id="addressBarangay"
              className={selectCls}
              value={formData.addressBarangay}
              onChange={handleChange}
              disabled={!formData.addressCity || loadingBarangays}
            >
              <option value="" disabled>{loadingBarangays ? 'Loading...' : 'Select Barangay'}</option>
              {barangays.map(b => (
                <option key={b.code} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Street / House No. - Input */}
          <div className="mb-3">
            <label className={labelCls}>Street / House No.</label>
            <input
              id="addressStreet"
              type="text"
              placeholder="House No., Street Name, Purok, etc."
              className={inputCls}
              value={formData.addressStreet}
              onChange={handleChange}
            />
          </div>

          {/* Zip Code - Input */}
          <div className="mb-3">
            <label className={labelCls}>Zip Code</label>
            <input
              id="addressZipCode"
              type="text"
              placeholder="e.g. 5000"
              className={inputCls}
              value={formData.addressZipCode}
              onChange={handleChange}
            />
          </div>

          </>
          )}

          {/* Full Address Preview */}
          {buildFullAddress(formData) && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-4">
              <label className={labelCls}>Full Address Preview</label>
              <p className="text-sm text-slate-700">{buildFullAddress(formData)}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 bg-[#2d7a52] text-white rounded-xl font-medium text-sm hover:bg-[#1a5c3a] transition"
          >
            Confirm Address
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}