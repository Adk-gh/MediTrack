// frontend/src/components/AddressModal.jsx

import React, { useEffect, useState } from 'react';
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
  'Other',
];

// Fallback generic barangays
const GENERIC_BARANGAYS = [
  'Poblacion',
  'Barangay 1',
  'Barangay 2',
  'Barangay 3',
  'Barangay 4',
  'Barangay 5',
  'San Antonio',
  'San Jose',
  'San Roque',
  'Santa Cruz',
  'Santo Nino',
  'Mabini',
  'Bulacao',
  'Lahug',
  'Parian',
  'Kamuning',
  'Vasra',
];

const inputCls =
  'w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] outline-none focus:border-[#4a635d] bg-white transition-colors';

const selectCls =
  'w-full px-[14px] py-[10px] border-[1.5px] border-[#cbd5d1] rounded-[13px] text-[13px] bg-white outline-none focus:border-[#4a635d] transition-colors';

const labelCls =
  'block text-[11px] font-bold text-[#64748b] uppercase mb-[4px] ml-[2px]';

export default function AddressModal({
  isOpen,
  onClose,
  onConfirm,
  initialData = {},
  zIndex = 100000,
}) {
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

  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingBarangays, setLoadingBarangays] = useState(false);

  const fetchRegions = async () => {
    setLoadingRegions(true);
    try {
      const response = await fetch(`${PSGC_API}/regions`);
      if (!response.ok) {
        throw new Error(`Failed to fetch regions: ${response.status}`);
      }

      const data = await response.json();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => a.name.localeCompare(b.name))
        : [];

      setRegions(sorted);
    } catch (error) {
      console.error('Error fetching regions:', error);
      setRegions([]);
    } finally {
      setLoadingRegions(false);
    }
  };

  const fetchProvinces = async (regionCode) => {
    if (!regionCode) {
      setProvinces([]);
      return;
    }

    setLoadingProvinces(true);
    try {
      const response = await fetch(
        `${PSGC_API}/regions/${regionCode}/provinces`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch provinces: ${response.status}`);
      }

      const data = await response.json();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => a.name.localeCompare(b.name))
        : [];

      setProvinces(sorted);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      setProvinces([]);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchCities = async (provinceCode) => {
    if (!provinceCode) {
      setCities([]);
      return;
    }

    setLoadingCities(true);
    try {
      const response = await fetch(
        `${PSGC_API}/provinces/${provinceCode}/cities-municipalities`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch cities: ${response.status}`);
      }

      const data = await response.json();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => a.name.localeCompare(b.name))
        : [];

      setCities(sorted);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchBarangays = async (cityCode) => {
    if (!cityCode) {
      setBarangays([]);
      return;
    }

    setLoadingBarangays(true);
    try {
      const response = await fetch(
        `${PSGC_API}/cities-municipalities/${cityCode}/barangays`,
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch barangays: ${response.status}`);
      }

      const data = await response.json();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => a.name.localeCompare(b.name))
        : [];

      setBarangays(sorted);
    } catch (error) {
      console.error('Error fetching barangays:', error);
      setBarangays(
        GENERIC_BARANGAYS.map((name) => ({
          code: name,
          name,
        })),
      );
    } finally {
      setLoadingBarangays(false);
    }
  };

  useEffect(() => {
    if (isOpen && regions.length === 0) {
      fetchRegions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

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

    if (initialData.addressRegionCode) {
      fetchProvinces(initialData.addressRegionCode);
    } else {
      setProvinces([]);
    }

    if (initialData.addressProvinceCode) {
      fetchCities(initialData.addressProvinceCode);
    } else {
      setCities([]);
    }

    if (initialData.addressCityCode) {
      fetchBarangays(initialData.addressCityCode);
    } else {
      setBarangays([]);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const updatedData = { [id]: value };

    if (id === 'addressCountry') {
      updatedData.addressRegion = '';
      updatedData.addressRegionCode = '';
      updatedData.addressProvince = '';
      updatedData.addressProvinceCode = '';
      updatedData.addressCity = '';
      updatedData.addressCityCode = '';
      updatedData.addressBarangay = '';
      updatedData.addressBarangayCode = '';
      updatedData.addressStreet = '';
      updatedData.addressZipCode = '';

      setProvinces([]);
      setCities([]);
      setBarangays([]);
    }

    if (id === 'addressRegion') {
      const selectedRegion = regions.find((r) => r.name === value);

      updatedData.addressRegionCode = selectedRegion?.code || '';
      updatedData.addressProvince = '';
      updatedData.addressProvinceCode = '';
      updatedData.addressCity = '';
      updatedData.addressCityCode = '';
      updatedData.addressBarangay = '';
      updatedData.addressBarangayCode = '';

      setProvinces([]);
      setCities([]);
      setBarangays([]);

      if (selectedRegion?.code) {
        fetchProvinces(selectedRegion.code);
      }
    }

    if (id === 'addressProvince') {
      const selectedProvince = provinces.find((p) => p.name === value);

      updatedData.addressProvinceCode = selectedProvince?.code || '';
      updatedData.addressCity = '';
      updatedData.addressCityCode = '';
      updatedData.addressBarangay = '';
      updatedData.addressBarangayCode = '';

      setCities([]);
      setBarangays([]);

      if (selectedProvince?.code) {
        fetchCities(selectedProvince.code);
      }
    }

    if (id === 'addressCity') {
      const selectedCity = cities.find((c) => c.name === value);

      updatedData.addressCityCode = selectedCity?.code || '';
      updatedData.addressBarangay = '';
      updatedData.addressBarangayCode = '';

      setBarangays([]);

      if (selectedCity?.code) {
        fetchBarangays(selectedCity.code);
      }
    }

    if (id === 'addressBarangay') {
      const selectedBarangay = barangays.find((b) => b.name === value);
      updatedData.addressBarangayCode = selectedBarangay?.code || '';
    }

    setFormData((prev) => ({
      ...prev,
      ...updatedData,
    }));
  };

  const buildFullAddress = (data) => {
    const parts = [];

    if (data.addressStreet) {
      parts.push(data.addressStreet);
    }

    if (data.addressBarangay) {
      const brgy = data.addressBarangay;
      const formattedBrgy = brgy.toLowerCase().startsWith('barangay ')
        ? brgy
        : `Barangay ${brgy}`;

      parts.push(formattedBrgy);
    }

    if (data.addressCity) {
      parts.push(data.addressCity);
    }

    if (data.addressProvince) {
      parts.push(data.addressProvince);
    }

    if (data.addressRegion) {
      parts.push(data.addressRegion);
    }

    if (data.addressCountry) {
      parts.push(data.addressCountry);
    }

    if (data.addressZipCode) {
      parts.push(data.addressZipCode);
    }

    return parts.join(', ');
  };

  const handleConfirm = () => {
    const fullAddress = buildFullAddress(formData);

    onConfirm({
      homeAddress: fullAddress,
      addressCountry: formData.addressCountry,
      addressRegion: formData.addressRegion,
      addressRegionCode: formData.addressRegionCode,
      addressProvince: formData.addressProvince,
      addressProvinceCode: formData.addressProvinceCode,
      addressCity: formData.addressCity,
      addressCityCode: formData.addressCityCode,
      addressBarangay: formData.addressBarangay,
      addressBarangayCode: formData.addressBarangayCode,
      addressStreet: formData.addressStreet,
      addressZipCode: formData.addressZipCode,
    });

    onClose();
  };

  if (!isOpen) return null;

  const fullAddressPreview = buildFullAddress(formData);
  const isPhilippines = formData.addressCountry === 'Philippines';

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1a2e22]">
            Enter Address
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close address modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="mb-4">
            <label className={labelCls}>Country</label>
            <select
              id="addressCountry"
              className={selectCls}
              value={formData.addressCountry}
              onChange={handleChange}
            >
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {!isPhilippines && (
            <>
              <div className="mb-3">
                <label className={labelCls}>Address</label>
                <input
                  id="addressStreet"
                  type="text"
                  placeholder="Street Address, City, State/Province"
                  className={inputCls}
                  value={formData.addressStreet}
                  onChange={handleChange}
                />
              </div>

              <div className="mb-3">
                <label className={labelCls}>Zip / Postal Code</label>
                <input
                  id="addressZipCode"
                  type="text"
                  placeholder="Postal code"
                  className={inputCls}
                  value={formData.addressZipCode}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {isPhilippines && (
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
                  <option value="" disabled>
                    {loadingRegions ? 'Loading...' : 'Select Region'}
                  </option>

                  {regions.map((region) => (
                    <option key={region.code} value={region.name}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className={labelCls}>Province</label>
                <select
                  id="addressProvince"
                  className={selectCls}
                  value={formData.addressProvince}
                  onChange={handleChange}
                  disabled={!formData.addressRegion || loadingProvinces}
                >
                  <option value="" disabled>
                    {loadingProvinces ? 'Loading...' : 'Select Province'}
                  </option>

                  {provinces.map((province) => (
                    <option key={province.code} value={province.name}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className={labelCls}>City/Municipality</label>
                <select
                  id="addressCity"
                  className={selectCls}
                  value={formData.addressCity}
                  onChange={handleChange}
                  disabled={!formData.addressProvince || loadingCities}
                >
                  <option value="" disabled>
                    {loadingCities
                      ? 'Loading...'
                      : 'Select City/Municipality'}
                  </option>

                  {cities.map((city) => (
                    <option key={city.code} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className={labelCls}>Barangay</label>
                <select
                  id="addressBarangay"
                  className={selectCls}
                  value={formData.addressBarangay}
                  onChange={handleChange}
                  disabled={!formData.addressCity || loadingBarangays}
                >
                  <option value="" disabled>
                    {loadingBarangays
                      ? 'Loading...'
                      : 'Select Barangay'}
                  </option>

                  {barangays.map((barangay) => (
                    <option
                      key={barangay.code || barangay.name}
                      value={barangay.name}
                    >
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="mb-3">
                <label className={labelCls}>Zip Code</label>
                <input
                  id="addressZipCode"
                  type="text"
                  placeholder="e.g. 4000"
                  className={inputCls}
                  value={formData.addressZipCode}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          {fullAddressPreview && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mt-4">
              <label className={labelCls}>Full Address Preview</label>
              <p className="text-sm text-slate-700">
                {fullAddressPreview}
              </p>
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
    document.body,
  );
}
