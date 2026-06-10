import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3, Bell, Boxes, Calculator, Cloud, CloudOff, Download, Edit3, FileDown,
  FileText, KeyRound, Keyboard, MessageCircle, Moon, Palette, Plus, Printer,
  ReceiptText, Search, Settings, Smartphone, Sun, Trash2, Upload, Users,
  WalletCards, Wrench, X,
  LogOut,
} from 'lucide-react';
import {
  API_URL,
  activeLicenseStatus, addExpense, addMobileWalletTransaction, createPurchase, createSale, dashboardSnapshot,
  activateLicenseAccount,
  cleanupStartupData, deleteRecord, deleteRemoteRecord, downloadPdf, ensureDeviceId, exportBackupFile, exportCsv, generateLicense,
  getBrandSettings, importBackupFile, importCsvRecords, importMasterCatalogCsv, listRecords, notificationCenter,
  importMedicinesFile, searchMedicines,
  printHtml, quickCustomer, receiptQrData, receiveCustomerPayment,
  reportData, saveBrandSettings, saveRecord, saveRemoteRecord, saveUserAccount, syncNow, hydrateRemoteStores, updateRepairStatus,
  whatsAppShare, createManualRepairReceipt, saveHospitalPatientWorkflow, syncHospitalPatientWorkflow, transitionHospitalPatientStatus,
  normalizePakistanPhone,
  completeHospitalPrescription, completeHospitalLabReport, completeHospitalRadiologyReport, reviewHospitalReport,
  recalculateHospitalBill, saveHospitalBillPayment, createTraderDeliveryChallan, createTraderRecovery,
  barcodeLookup, receiveInventoryByScan,
} from './lib/db.js';
import './styles/app.css';

const MODULES = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'pos', label: 'Sales POS', icon: ReceiptText },
  { id: 'sales', label: 'Sales', icon: FileText },
  { id: 'products', label: 'Inventory', icon: Boxes },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'credit', label: 'Udhaar', icon: WalletCards },
  { id: 'mobileWallets', label: 'EasyPaisa / JazzCash', icon: WalletCards },
  { id: 'repairs', label: 'Repairs', icon: Wrench },
  { id: 'repairReceipts', label: 'Repair Receipts', icon: Printer },
  { id: 'warrantyClaims', label: 'Warranty Claims', icon: KeyRound },
  { id: 'returns', label: 'Returns', icon: Download },
  { id: 'traderCompanies', label: 'Companies', icon: Boxes },
  { id: 'traderBrands', label: 'Brands', icon: Boxes },
  { id: 'traderTerritories', label: 'Territories', icon: FileText },
  { id: 'traderRoutes', label: 'Routes', icon: FileText },
  { id: 'traderSalesmen', label: 'Salesmen', icon: Users },
  { id: 'traderRetailers', label: 'Retailers', icon: Users },
  { id: 'traderChallans', label: 'Delivery Challan', icon: Upload },
  { id: 'traderRecoveries', label: 'Recovery', icon: WalletCards },
  { id: 'traderSalesmanLedger', label: 'Salesman Ledger', icon: FileText },
  { id: 'traderDistributorLedger', label: 'Distributor Ledger', icon: FileText },
  { id: 'purchases', label: 'Purchases', icon: Upload },
  { id: 'suppliers', label: 'Suppliers', icon: Smartphone },
  { id: 'expenses', label: 'Expenses', icon: Calculator },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'accounting', label: 'Accounting', icon: FileText },
  { id: 'reports', label: 'Reports', icon: Download },
  { id: 'catalog', label: 'Master Catalog', icon: Boxes },
  { id: 'medicines', label: 'Medicines', icon: FileText },
  { id: 'backup', label: 'Backup', icon: Download },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'assistants', label: 'Assistants', icon: Users },
  { id: 'hospitalPharmacy', label: 'Hospital Pharmacy', icon: Boxes },
  { id: 'hospitalTasks', label: 'Injection Room', icon: Wrench },
  { id: 'labReports', label: 'Lab Reports', icon: FileText },
  { id: 'radiologyReports', label: 'Radiology', icon: FileText },
  { id: 'hospitalBilling', label: 'Hospital Billing', icon: Calculator },
  { id: 'licenses', label: 'Licenses', icon: KeyRound },
  { id: 'settings', label: 'Admin', icon: Settings },
];

const SHOP_TYPES = ['Mobile Shop', 'Hospital', 'Grocery Store', 'Pharmacy', 'General Store', 'Traders', 'Shopping Mall', 'Electronics Store', 'Clothing Store', 'Hardware Store'];
const REPAIR_SHOP_TYPES = new Set(['Mobile Shop', 'Electronics Store']);
const HOSPITAL_MODULES = new Set(['patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'hospitalBilling']);
const SUPER_ADMIN_MODULES = new Set(['licenses', 'settings']);
const MOBILE_SHOP_MODULES = new Set(['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'mobileWallets', 'repairs', 'repairReceipts', 'purchases', 'suppliers', 'expenses', 'reports', 'backup', 'users', 'warrantyClaims', 'returns']);
const HOSPITAL_BUSINESS_MODULES = new Set(['dashboard', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'hospitalBilling', 'expenses', 'notifications', 'accounting', 'reports', 'catalog', 'medicines', 'backup', 'users']);
const GENERIC_SHOP_MODULES = new Set(['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'mobileWallets', 'purchases', 'suppliers', 'expenses', 'reports', 'catalog', 'backup', 'users']);
const PHARMACY_MODULES = new Set(['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'mobileWallets', 'purchases', 'suppliers', 'expenses', 'reports', 'catalog', 'medicines', 'backup', 'users']);
const TRADERS_MODULES = new Set(['dashboard', 'pos', 'sales', 'products', 'traderCompanies', 'traderBrands', 'traderTerritories', 'traderRoutes', 'traderSalesmen', 'traderRetailers', 'traderChallans', 'traderRecoveries', 'traderSalesmanLedger', 'traderDistributorLedger', 'purchases', 'suppliers', 'expenses', 'reports', 'catalog', 'backup', 'users']);
const GENERAL_STORE_CATEGORIES = ['Beverages', 'Water', 'Juices', 'Biscuits', 'Snacks', 'Dairy', 'Grocery', 'Confectionery', 'Personal Care', 'Household'];
const TRADERS_CATEGORIES = ['Beverages', 'Water', 'Juices', 'Biscuits', 'Snacks', 'Dairy', 'Grocery', 'Confectionery', 'Personal Care', 'Household', 'Company Stock'];
const RETAIL_UNITS = ['Single Unit', 'Piece', 'Bottle', 'Pack', 'Pet', 'Box', 'Carton', 'Tray', 'Case', 'Dozen', 'Bag', 'Tablet', 'Strip', 'Kg', 'Gram', 'Liter', 'ML', 'Half Carton', 'pcs', 'kg', 'gram', 'liter', 'meter'];

const ROLE_MODULES = {
  'Super Admin': ['dashboard', 'licenses', 'users', 'settings', 'backup', 'reports', 'notifications'],
  Admin: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'mobileWallets', 'repairs', 'repairReceipts', 'warrantyClaims', 'returns', 'traderCompanies', 'traderBrands', 'traderTerritories', 'traderRoutes', 'traderSalesmen', 'traderRetailers', 'traderChallans', 'traderRecoveries', 'traderSalesmanLedger', 'traderDistributorLedger', 'purchases', 'suppliers', 'expenses', 'notifications', 'accounting', 'reports', 'catalog', 'medicines', 'backup', 'users', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'hospitalBilling'],
  'Hospital Owner': ['dashboard', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'hospitalBilling', 'expenses', 'notifications', 'reports', 'catalog', 'medicines', 'backup', 'users'],
  Receptionist: ['dashboard', 'patients', 'hospitalBilling', 'notifications'],
  Manager: ['dashboard', 'pos', 'sales', 'products', 'customers', 'credit', 'mobileWallets', 'repairs', 'repairReceipts', 'warrantyClaims', 'returns', 'traderCompanies', 'traderBrands', 'traderTerritories', 'traderRoutes', 'traderSalesmen', 'traderRetailers', 'traderChallans', 'traderRecoveries', 'traderSalesmanLedger', 'traderDistributorLedger', 'purchases', 'suppliers', 'expenses', 'notifications', 'reports', 'catalog', 'medicines', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'hospitalBilling'],
  Cashier: ['dashboard', 'pos', 'sales', 'customers', 'credit', 'mobileWallets', 'traderRetailers', 'traderRecoveries', 'repairReceipts', 'warrantyClaims', 'returns', 'notifications'],
  Technician: ['dashboard', 'customers', 'repairs', 'repairReceipts', 'warrantyClaims', 'notifications'],
  Doctor: ['dashboard', 'patients', 'assistants', 'hospitalPharmacy', 'hospitalTasks', 'labReports', 'radiologyReports', 'expenses', 'notifications', 'reports', 'catalog', 'medicines', 'backup'],
  Compounder: ['dashboard', 'patients', 'hospitalTasks', 'hospitalPharmacy', 'notifications', 'catalog', 'medicines'],
  Assistant: ['dashboard', 'patients', 'hospitalTasks', 'hospitalPharmacy', 'notifications', 'catalog', 'medicines'],
  Nurse: ['dashboard', 'hospitalTasks', 'patients', 'notifications'],
  'Pharmacy Staff': ['dashboard', 'hospitalPharmacy', 'products', 'medicines', 'notifications'],
  'Lab Technician': ['dashboard', 'labReports', 'hospitalTasks', 'notifications'],
  'X-Ray Technician': ['dashboard', 'radiologyReports', 'hospitalTasks', 'notifications'],
  'Billing Officer': ['dashboard', 'hospitalBilling', 'patients', 'notifications'],
};

function userRole(user) {
  return user?.role?.name || user?.role_name || user?.role || 'Cashier';
}

function modulesForBusiness(modules, brand, role) {
  if (role === 'Super Admin') return modules;
  const key = businessTypeKey(brand?.business_type || localStorage.getItem('dsh_business_type') || 'General Store');
  if (key === 'hospital') {
    return modules.filter((item) => HOSPITAL_BUSINESS_MODULES.has(item.id));
  }
  if (key === 'mobile_shop') {
    return modules.filter((item) => MOBILE_SHOP_MODULES.has(item.id));
  }
  if (key === 'pharmacy') {
    return modules.filter((item) => PHARMACY_MODULES.has(item.id));
  }
  if (key === 'traders') {
    return modules.filter((item) => TRADERS_MODULES.has(item.id));
  }
  let scoped = modules.filter((item) => !HOSPITAL_MODULES.has(item.id) && !SUPER_ADMIN_MODULES.has(item.id));
  scoped = scoped.filter((item) => GENERIC_SHOP_MODULES.has(item.id) || (REPAIR_SHOP_TYPES.has(brand?.business_type) && ['repairs', 'repairReceipts'].includes(item.id)));
  return scoped;
}

function businessTypeKey(type) {
  const normalized = String(type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['mobile_shop', 'mobile'].includes(normalized)) return 'mobile_shop';
  if (normalized === 'hospital') return 'hospital';
  if (normalized === 'pharmacy') return 'pharmacy';
  if (normalized === 'traders') return 'traders';
  if (['general_store', 'grocery_store', 'grocery', 'shopping_mall', 'retail_shop'].includes(normalized)) return 'general_store';
  return 'generic_shop';
}

const BUSINESS_TYPE_RULES = {
  mobile_shop: {
    showImei: true,
    showWarranty: true,
    showBatch: false,
    showExpiry: false,
    showMedicine: false,
    showPackaging: false,
    showTrader: false,
    inventoryColumns: ['product_name', 'category', 'brand', 'model', 'imei_numbers', 'serial_number', 'warranty', 'quantity', 'purchase_price', 'sale_price', 'status'],
    inventorySearch: ['product_name', 'brand', 'model', 'barcode', 'secondary_barcode', 'qr_code', 'sku', 'product_code', 'imei', 'imei_numbers', 'serial_number'],
    posSearch: ['product_name', 'brand', 'model', 'barcode', 'secondary_barcode', 'qr_code', 'sku', 'product_code', 'imei', 'imei_numbers', 'serial_number'],
    posCartColumns: ['product_name', 'imei_numbers', 'selected_unit', 'unit_conversion', 'available_stock', 'price', 'quantity', 'line_total'],
    detailFields: ['barcode', 'secondary_barcode', 'qr_code', 'product_code', 'sku', 'model', 'imei_numbers', 'serial_number', 'warranty', 'supplier_name'],
  },
  pharmacy: {
    showImei: false,
    showWarranty: false,
    showBatch: true,
    showExpiry: true,
    showMedicine: true,
    showPackaging: true,
    showTrader: false,
    inventoryColumns: ['product_name', 'generic_name', 'category', 'brand', 'batch_number', 'expiry_date', 'manufacturer', 'strength', 'dosage_form', 'quantity', 'purchase_price', 'sale_price', 'status'],
    inventorySearch: ['product_name', 'generic_name', 'composition', 'brand', 'barcode', 'secondary_barcode', 'qr_code', 'sku', 'product_code', 'batch_number', 'manufacturer'],
    posSearch: ['product_name', 'generic_name', 'composition', 'brand', 'barcode', 'secondary_barcode', 'qr_code', 'sku', 'product_code', 'batch_number', 'manufacturer'],
    posCartColumns: ['product_name', 'batch_number', 'expiry_date', 'selected_unit', 'unit_conversion', 'available_stock', 'price', 'quantity', 'line_total'],
    detailFields: ['barcode', 'secondary_barcode', 'qr_code', 'product_code', 'sku', 'generic_name', 'composition', 'strength', 'dosage_form', 'batch_number', 'expiry_date', 'manufacturer', 'supplier_name'],
  },
  general_store: {
    showImei: false,
    showWarranty: false,
    showBatch: false,
    showExpiry: false,
    showMedicine: false,
    showPackaging: true,
    showTrader: false,
    inventoryColumns: ['product_name', 'category', 'brand', 'barcode', 'pack_size', 'unit', 'package_quantity', 'units_per_package', 'quantity', 'packaging_view', 'purchase_price', 'sale_price', 'low_stock_threshold', 'status'],
    inventorySearch: ['product_name', 'brand', 'category', 'barcode', 'secondary_barcode', 'qr_code', 'box_barcode', 'carton_barcode', 'sku', 'product_code', 'pack_size', 'unit'],
    posSearch: ['product_name', 'brand', 'category', 'barcode', 'secondary_barcode', 'qr_code', 'box_barcode', 'carton_barcode', 'sku', 'product_code', 'pack_size', 'unit'],
    posCartColumns: ['product_name', 'selected_unit', 'unit_conversion', 'available_stock', 'price', 'quantity', 'line_total'],
    detailFields: ['barcode', 'secondary_barcode', 'qr_code', 'product_code', 'box_barcode', 'carton_barcode', 'sku', 'variant_type', 'pack_size', 'supplier_name'],
  },
  traders: {
    showImei: false,
    showWarranty: false,
    showBatch: false,
    showExpiry: false,
    showMedicine: false,
    showPackaging: true,
    showTrader: true,
    inventoryColumns: ['product_name', 'category', 'brand', 'barcode', 'pack_size', 'unit', 'package_quantity', 'units_per_package', 'quantity', 'packaging_view', 'purchase_price', 'sale_price', 'status'],
    inventorySearch: ['product_name', 'brand', 'category', 'barcode', 'secondary_barcode', 'qr_code', 'box_barcode', 'carton_barcode', 'sku', 'product_code', 'pack_size', 'unit'],
    posSearch: ['product_name', 'brand', 'category', 'barcode', 'secondary_barcode', 'qr_code', 'box_barcode', 'carton_barcode', 'sku', 'product_code', 'pack_size', 'unit'],
    posCartColumns: ['product_name', 'selected_unit', 'unit_conversion', 'available_stock', 'price', 'quantity', 'line_total'],
    detailFields: ['barcode', 'secondary_barcode', 'qr_code', 'product_code', 'box_barcode', 'carton_barcode', 'sku', 'variant_type', 'pack_size', 'supplier_name'],
  },
  hospital: {
    showImei: false,
    showWarranty: false,
    showBatch: true,
    showExpiry: true,
    showMedicine: true,
    showPackaging: false,
    showTrader: false,
    inventoryColumns: ['product_name', 'generic_name', 'category', 'batch_number', 'expiry_date', 'manufacturer', 'strength', 'dosage_form', 'quantity', 'purchase_price', 'sale_price', 'status'],
    inventorySearch: ['product_name', 'generic_name', 'composition', 'barcode', 'secondary_barcode', 'qr_code', 'sku', 'product_code', 'batch_number', 'manufacturer'],
    posSearch: ['product_name', 'generic_name', 'composition', 'barcode', 'secondary_barcode', 'qr_code', 'sku', 'product_code', 'batch_number', 'manufacturer'],
    posCartColumns: ['product_name', 'batch_number', 'expiry_date', 'selected_unit', 'unit_conversion', 'available_stock', 'price', 'quantity', 'line_total'],
    detailFields: ['barcode', 'secondary_barcode', 'qr_code', 'product_code', 'sku', 'generic_name', 'composition', 'strength', 'dosage_form', 'batch_number', 'expiry_date', 'manufacturer', 'supplier_name'],
  },
};

function businessTypeRules(brandOrType) {
  const key = typeof brandOrType === 'string' ? businessTypeKey(brandOrType) : businessTypeKey(brandOrType?.business_type || localStorage.getItem('dsh_business_type'));
  return BUSINESS_TYPE_RULES[key] || BUSINESS_TYPE_RULES.general_store;
}

function invoiceMetaParts(item, brand = {}) {
  const rules = businessTypeRules(brand);
  const parts = [];
  if (rules.showImei && imeiListText(item)) parts.push(['IMEI / Serial', imeiListText(item)]);
  if (rules.showBatch && item.batch_number) parts.push(['Batch', item.batch_number]);
  if (rules.showExpiry && item.expiry_date) parts.push(['Expiry', item.expiry_date]);
  return parts;
}

function categoriesForBusiness(brand) {
  const type = brand?.business_type || 'General Store';
  const groups = {
    'Mobile Shop': ['Mobile Phones', 'Accessories', 'Spare Parts', 'Electronics'],
    'Electronics Store': ['Electronics', 'Accessories', 'Spare Parts'],
    'Pharmacy': ['Medicine', 'Healthcare', 'Personal Care', 'Baby Care'],
    'Grocery Store': GENERAL_STORE_CATEGORIES,
    'General Store': GENERAL_STORE_CATEGORIES,
    Traders: TRADERS_CATEGORIES,
    'Shopping Mall': [...GENERAL_STORE_CATEGORIES, 'Electronics', 'Clothing'],
    'Clothing Store': ['Clothing', 'Footwear', 'Accessories'],
    'Hardware Store': ['Hardware', 'Tools', 'Electrical', 'Plumbing'],
    Hospital: ['Medicine', 'Healthcare', 'Lab Supplies', 'General'],
  };
  return groups[type] || groups['General Store'];
}

function catalogPresetRecord(item, businessType) {
  const [
    productName,
    category,
    itemBrand,
    subcategory = '',
    packSize = '',
    unit = 'Single Unit',
    defaultCost = 0,
    defaultPrice = 0,
    barcode = '',
  ] = item;
  return {
    name: productName,
    product_name: productName,
    business_type: businessType,
    category,
    subcategory,
    brand: itemBrand,
    barcode,
    pack_size: packSize,
    type: subcategory || category,
    unit,
    default_cost: Number(defaultCost || 0),
    default_price: Number(defaultPrice || 0),
    notes: 'Built-in starter catalog',
  };
}

const RESOURCES = {
  products: {
    title: 'Inventory Management',
    store: 'products',
    search: ['display_name', 'product_name', 'category', 'brand', 'model', 'pack_size', 'unit', 'variant_type', 'sku', 'product_code', 'imei', 'imei_numbers', 'barcode', 'secondary_barcode', 'qr_code', 'box_barcode', 'carton_barcode', 'batch_number', 'status'],
    columns: ['product_name', 'category', 'brand', 'imei_numbers', 'unit', 'package_quantity', 'units_per_package', 'quantity', 'packaging_view', 'purchase_price', 'package_cost_price', 'total_cost', 'sale_price', 'low_stock_threshold', 'status'],
    rowMap: inventoryRows,
    fields: [
      ['product_name', 'Product Name', 'text', true], ['category', 'Category', 'select', true, ['General', ...TRADERS_CATEGORIES, 'Pharmacy', 'Electronics', 'Clothing', 'Hardware', 'Accessories', 'Spare Parts']], ['company_name', 'Company Name'], ['company_uuid', 'Company UUID'], ['brand', 'Brand'], ['model', 'Model'],
      ['sku', 'SKU'], ['product_code', 'Product Code'], ['barcode', 'Barcode'], ['secondary_barcode', 'Secondary Barcode'], ['qr_code', 'QR Code'], ['box_barcode', 'Box Barcode'], ['carton_barcode', 'Carton Barcode'], ['unit', 'Unit', 'select', true, RETAIL_UNITS], ['variant_type', 'Variant Type', 'select', false, RETAIL_UNITS], ['pack_size', 'Pack Size'], ['batch_number', 'Batch Number'],
      ['expiry_date', 'Expiry Date', 'date'], ['imei_numbers', 'IMEI Numbers'], ['purchase_price', 'Purchase Price', 'number'], ['sale_price', 'Sale Price', 'number'],
      ['quantity', 'Quantity', 'number'], ['low_stock_threshold', 'Low Stock Warning', 'number'], ['manufacturer', 'Manufacturer'], ['warranty', 'Warranty'], ['supplier_name', 'Supplier'],
    ],
  },
  customers: {
    title: 'Customer Management',
    store: 'customers',
    search: ['name', 'phone', 'cnic', 'address'],
    columns: ['name', 'phone', 'cnic', 'address', 'balance', 'notes'],
    fields: [['name', 'Customer Name', 'text', true], ['phone', 'Phone'], ['cnic', 'CNIC'], ['address', 'Address'], ['notes', 'Notes'], ['balance', 'Opening Balance', 'number']],
  },
  suppliers: {
    title: 'Supplier Management',
    store: 'suppliers',
    search: ['supplier_name', 'phone', 'address'],
    columns: ['supplier_name', 'phone', 'address', 'balance'],
    fields: [['supplier_name', 'Supplier Name', 'text', true], ['phone', 'Phone'], ['address', 'Address'], ['notes', 'Notes'], ['balance', 'Opening Balance', 'number']],
  },
  expenses: {
    title: 'Expense Management',
    store: 'expenses',
    search: ['category', 'description'],
    columns: ['category', 'description', 'amount', 'spent_at'],
    fields: [['category', 'Category', 'select', true, ['Rent', 'Electricity', 'Salary', 'Internet', 'Fuel', 'Maintenance', 'Other']], ['description', 'Description'], ['amount', 'Amount', 'number', true], ['spent_at', 'Date', 'date']],
    customSave: addExpense,
  },
  mobile_wallet_transactions: {
    title: 'EasyPaisa / JazzCash',
    store: 'mobile_wallet_transactions',
    search: ['provider', 'type', 'customer_name', 'phone', 'reference_number', 'status'],
    columns: ['provider', 'type', 'customer_name', 'phone', 'amount', 'fee', 'net_amount', 'reference_number', 'status', 'transacted_at'],
    fields: [['provider', 'Provider', 'select', true, ['EasyPaisa', 'JazzCash']], ['type', 'Type', 'select', true, ['Cash In', 'Cash Out']], ['customer_name', 'Customer Name'], ['phone', 'Phone'], ['amount', 'Amount', 'number', true], ['fee', 'Fee / Charges', 'number'], ['reference_number', 'Transaction ID'], ['status', 'Status', 'select', true, ['Completed', 'Pending', 'Failed']], ['transacted_at', 'Date', 'date'], ['notes', 'Notes']],
    customSave: addMobileWalletTransaction,
  },
  trader_companies: {
    title: 'Companies',
    store: 'trader_companies',
    search: ['company_name', 'contact_person', 'phone', 'email', 'status'],
    columns: ['company_name', 'contact_person', 'phone', 'email', 'status'],
    fields: [['company_name', 'Company Name', 'text', true], ['contact_person', 'Contact Person'], ['phone', 'Phone'], ['email', 'Email'], ['address', 'Address'], ['status', 'Status', 'select', true, ['Active', 'Inactive']]],
    defaultRecord: () => ({ status: 'Active' }),
  },
  trader_brands: {
    title: 'Brands',
    store: 'trader_brands',
    search: ['brand_name', 'company_name', 'description'],
    columns: ['brand_name', 'company_name', 'description'],
    fields: [['brand_name', 'Brand Name', 'text', true], ['company_uuid', 'Company UUID'], ['company_name', 'Company Name'], ['description', 'Description']],
  },
  trader_territories: {
    title: 'Territories',
    store: 'trader_territories',
    search: ['territory_name', 'city', 'area'],
    columns: ['territory_name', 'city', 'area', 'notes'],
    fields: [['territory_name', 'Territory Name', 'text', true], ['city', 'City'], ['area', 'Area'], ['notes', 'Notes']],
  },
  trader_routes: {
    title: 'Routes',
    store: 'trader_routes',
    search: ['route_name', 'route_code', 'territory_name'],
    columns: ['route_name', 'route_code', 'territory_name'],
    fields: [['route_name', 'Route Name', 'text', true], ['route_code', 'Route Code'], ['territory_uuid', 'Territory UUID'], ['territory_name', 'Territory Name']],
  },
  trader_salesmen: {
    title: 'Salesmen',
    store: 'trader_salesmen',
    search: ['name', 'phone', 'territory_name', 'route_name', 'status'],
    columns: ['name', 'phone', 'territory_name', 'route_name', 'commission_type', 'commission_value', 'status'],
    fields: [['name', 'Salesman Name', 'text', true], ['phone', 'Phone'], ['territory_uuid', 'Territory UUID'], ['territory_name', 'Territory Name'], ['route_uuid', 'Route UUID'], ['route_name', 'Route Name'], ['commission_type', 'Commission Type', 'select', true, ['Percentage', 'Fixed']], ['commission_value', 'Commission Value', 'number'], ['status', 'Status', 'select', true, ['Active', 'Inactive']]],
    defaultRecord: () => ({ commission_type: 'Percentage', commission_value: 0, status: 'Active' }),
  },
  trader_retailers: {
    title: 'Retailers / Customers',
    store: 'trader_retailers',
    search: ['shop_name', 'owner_name', 'phone', 'territory_name', 'route_name'],
    columns: ['shop_name', 'owner_name', 'phone', 'territory_name', 'route_name', 'credit_limit', 'balance'],
    fields: [['shop_name', 'Shop Name', 'text', true], ['owner_name', 'Owner Name'], ['phone', 'Phone'], ['address', 'Address'], ['territory_uuid', 'Territory UUID'], ['territory_name', 'Territory Name'], ['route_uuid', 'Route UUID'], ['route_name', 'Route Name'], ['credit_limit', 'Credit Limit', 'number'], ['balance', 'Balance', 'number']],
    defaultRecord: () => ({ credit_limit: 0, balance: 0 }),
  },
  trader_delivery_challans: {
    title: 'Delivery Challan',
    store: 'trader_delivery_challans',
    search: ['challan_number', 'retailer_name', 'salesman_name', 'vehicle_number', 'status'],
    columns: ['challan_number', 'retailer_name', 'salesman_name', 'vehicle_number', 'date', 'status'],
    fields: [['challan_number', 'Challan Number'], ['retailer_uuid', 'Retailer UUID'], ['retailer_name', 'Retailer Name'], ['salesman_uuid', 'Salesman UUID'], ['salesman_name', 'Salesman Name'], ['vehicle_number', 'Vehicle Number'], ['date', 'Date', 'date'], ['status', 'Status', 'select', true, ['Draft', 'Loaded', 'Delivered', 'Returned']]],
    defaultRecord: () => ({ date: new Date().toISOString().slice(0, 10), status: 'Draft' }),
    customSave: createTraderDeliveryChallan,
  },
  trader_recoveries: {
    title: 'Recovery',
    store: 'trader_recoveries',
    search: ['retailer_name', 'salesman_name', 'payment_method', 'notes'],
    columns: ['retailer_name', 'salesman_name', 'amount', 'payment_method', 'date', 'notes'],
    fields: [['retailer_uuid', 'Retailer UUID', 'text', true], ['retailer_name', 'Retailer Name'], ['salesman_uuid', 'Salesman UUID'], ['salesman_name', 'Salesman Name'], ['amount', 'Amount', 'number', true], ['payment_method', 'Payment Method', 'select', true, ['Cash', 'Bank', 'EasyPaisa', 'JazzCash', 'Cheque']], ['date', 'Date', 'date'], ['notes', 'Notes']],
    defaultRecord: () => ({ date: new Date().toISOString().slice(0, 10), payment_method: 'Cash' }),
    customSave: createTraderRecovery,
  },
  trader_salesman_ledgers: {
    title: 'Salesman Ledger',
    store: 'trader_salesman_ledgers',
    search: ['salesman_name', 'type', 'reference'],
    columns: ['salesman_name', 'type', 'debit', 'credit', 'commission', 'reference', 'entry_at'],
    fields: [['salesman_uuid', 'Salesman UUID'], ['salesman_name', 'Salesman Name'], ['type', 'Type'], ['debit', 'Debit', 'number'], ['credit', 'Credit', 'number'], ['commission', 'Commission', 'number'], ['reference', 'Reference'], ['entry_at', 'Entry At', 'date']],
  },
  trader_distributor_ledgers: {
    title: 'Distributor Ledger',
    store: 'trader_distributor_ledgers',
    search: ['type', 'description', 'reference'],
    columns: ['type', 'description', 'debit', 'credit', 'reference', 'entry_at'],
    fields: [['type', 'Type'], ['description', 'Description'], ['debit', 'Debit', 'number'], ['credit', 'Credit', 'number'], ['reference', 'Reference'], ['entry_at', 'Entry At', 'date']],
  },
  repairs: {
    title: 'Repair Management',
    store: 'repairs',
    search: ['job_number', 'customer_name', 'device_name', 'imei', 'problem', 'technician', 'status'],
    columns: ['job_number', 'customer_name', 'device_name', 'imei', 'problem', 'technician', 'charges', 'status'],
    fields: [['job_number', 'Job Number'], ['customer_name', 'Customer'], ['device_name', 'Device Name'], ['imei', 'IMEI'], ['problem', 'Problem'], ['technician', 'Technician'], ['charges', 'Charges', 'number'], ['delivery_date', 'Delivery Date', 'date'], ['status', 'Status', 'select', true, ['Received', 'Diagnosed', 'In Progress', 'Waiting Parts', 'Completed', 'Delivered']]],
  },
  warranty_claims: {
    title: 'Warranty Claims',
    store: 'warranty_claims',
    search: ['claim_number', 'customer_name', 'product_name', 'imei_1', 'status'],
    columns: ['claim_number', 'customer_name', 'product_name', 'imei_1', 'claim_date', 'warranty_end', 'status'],
    fields: [['claim_number', 'Claim Number'], ['customer_name', 'Customer Name'], ['product_name', 'Product Name'], ['imei_1', 'IMEI'], ['claim_date', 'Claim Date', 'date'], ['warranty_start', 'Warranty Start', 'date'], ['warranty_end', 'Warranty End', 'date'], ['issue', 'Issue'], ['resolution', 'Resolution'], ['status', 'Status', 'select', true, ['Open', 'Approved', 'Rejected', 'Resolved']]],
  },
  sale_returns: {
    title: 'Sale Returns',
    store: 'sale_returns',
    search: ['return_number', 'invoice_number', 'customer_name', 'status'],
    columns: ['return_number', 'invoice_number', 'customer_name', 'refund_amount', 'status', 'returned_at'],
    fields: [['return_number', 'Return Number'], ['invoice_number', 'Invoice Number'], ['customer_name', 'Customer Name'], ['return_type', 'Return Type', 'select', true, ['Refund', 'Exchange']], ['refund_amount', 'Refund Amount', 'number'], ['status', 'Status', 'select', true, ['Completed', 'Pending']], ['returned_at', 'Returned At', 'date']],
  },
  purchase_returns: {
    title: 'Purchase Returns',
    store: 'purchase_returns',
    search: ['return_number', 'invoice_number', 'supplier_name', 'status'],
    columns: ['return_number', 'invoice_number', 'supplier_name', 'total', 'status', 'returned_at'],
    fields: [['return_number', 'Return Number'], ['invoice_number', 'Invoice Number'], ['supplier_name', 'Supplier Name'], ['total', 'Total', 'number'], ['status', 'Status', 'select', true, ['Completed', 'Pending']], ['returned_at', 'Returned At', 'date']],
  },
  users: {
    title: 'User Management',
    store: 'users',
    search: ['name', 'email', 'role', 'status'],
    columns: ['name', 'email', 'role', 'status'],
    fields: [['name', 'Name', 'text', true], ['email', 'Email', 'email', true], ['role', 'Role', 'select', true, ['Super Admin', 'Admin', 'Manager', 'Cashier', 'Technician', 'Doctor', 'Compounder', 'Assistant']], ['status', 'Status', 'select', true, ['Active', 'Disabled']], ['password', 'Password']],
    defaultRecord: ({ brand }) => ({ status: 'Active', shop_name: brand?.shop_name || brand?.company_name || 'Retail Shop', business_type: brand?.business_type || 'General Store' }),
    customSave: saveUserAccount,
  },
  patients: {
    title: 'Patient Management',
    store: 'patients',
    search: ['token_number', 'mr_number', 'patient_name', 'phone', 'cnic', 'doctor_name', 'diagnosis', 'status'],
    columns: ['token_number', 'mr_number', 'patient_name', 'phone', 'age', 'gender', 'department', 'doctor_name', 'visit_type', 'status', 'visit_date'],
    fields: [['mr_number', 'MR Number'], ['patient_name', 'Patient Name', 'text', true], ['guardian_name', 'Father / Husband Name'], ['phone', 'Mobile'], ['cnic', 'CNIC'], ['gender', 'Gender', 'select', false, ['Male', 'Female', 'Other']], ['age', 'Age', 'number'], ['address', 'Address'], ['emergency_contact', 'Emergency Contact'], ['blood_group', 'Blood Group', 'select', false, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']], ['visit_type', 'Visit Type', 'select', false, ['OPD', 'Follow-up', 'Emergency', 'Admission']], ['department', 'Department'], ['doctor_name', 'Doctor Selection', 'text', true], ['registration_fee', 'Registration Fee', 'number'], ['assistant_name', 'Assistant / Compounder'], ['symptoms', 'Symptoms'], ['diagnosis', 'Diagnosis'], ['clinical_notes', 'Clinical Notes'], ['vitals', 'Vitals'], ['blood_pressure', 'Blood Pressure'], ['sugar_level', 'Sugar Level'], ['temperature', 'Temperature'], ['weight', 'Weight'], ['prescription_items', 'Smart Prescription', 'prescription'], ['doctor_orders', 'Doctor Orders', 'orders'], ['fee', 'Doctor Fee', 'number'], ['status', 'Status', 'select', true, ['Waiting', 'Doctor Checked', 'Sent To Reception', 'Under Treatment', 'Treatment Completed', 'Closed']], ['visit_date', 'Visit Date', 'date'], ['next_visit', 'Next Checkup Date', 'date'], ['notes', 'Notes']],
    defaultRecord: ({ auth, brand }) => ({ status: 'Sent To Reception', visit_type: 'OPD', visit_date: new Date().toISOString().slice(0, 10), doctor_name: currentDoctorName(auth, brand) }),
    customSave: saveHospitalPatientWorkflow,
  },
  assistants: {
    title: 'Assistant Management',
    store: 'assistants',
    search: ['name', 'phone', 'role', 'doctor_name', 'status'],
    columns: ['name', 'phone', 'role', 'doctor_name', 'shift', 'status'],
    fields: [['name', 'Assistant Name', 'text', true], ['phone', 'Phone'], ['role', 'Role', 'select', true, ['Compounder', 'Assistant', 'Receptionist', 'Nurse', 'Pharmacy Staff', 'Lab Technician', 'X-Ray Technician', 'Billing Officer']], ['doctor_name', 'Doctor Name'], ['shift', 'Shift', 'select', false, ['Morning', 'Evening', 'Night', 'Full Day']], ['salary', 'Salary', 'number'], ['status', 'Status', 'select', true, ['Active', 'Disabled']], ['notes', 'Notes']],
    defaultRecord: ({ auth, brand }) => ({ status: 'Active', role: 'Compounder', doctor_name: currentDoctorName(auth, brand) }),
  },
  master_catalogs: {
    title: 'Master Catalog',
    store: 'master_catalogs',
    search: ['name', 'product_name', 'business_type', 'category', 'subcategory', 'brand', 'barcode', 'pack_size', 'unit', 'notes'],
    columns: ['product_name', 'category', 'subcategory', 'brand', 'barcode', 'pack_size', 'unit', 'default_cost', 'default_price'],
    fields: [['product_name', 'Product Name', 'text', true], ['business_type', 'Business Type', 'select', true, SHOP_TYPES], ['category', 'Category'], ['subcategory', 'Subcategory'], ['brand', 'Brand'], ['barcode', 'Barcode'], ['pack_size', 'Pack Size'], ['unit', 'Unit', 'select', true, RETAIL_UNITS], ['default_cost', 'Default Cost', 'number'], ['default_price', 'Default Price', 'number'], ['notes', 'Notes']],
    defaultRecord: ({ brand }) => ({ business_type: brand?.business_type || 'General Store', unit: 'Single Unit', default_cost: 0, default_price: 0 }),
  },
  settings: {
    title: 'Admin Panel Settings',
    store: 'settings',
    search: ['key', 'value'],
    columns: ['key', 'value'],
    fields: [['key', 'Setting Name', 'text', true], ['value', 'Value', 'text', true]],
  },
};

const MEDICINE_COLUMNS = [
  'brand_name', 'generic_name', 'strength', 'dosage_form', 'category', 'manufacturer',
  'barcode', 'pack_size', 'purchase_price', 'sale_price', 'mrp', 'reorder_level', 'status',
];

const MEDICINE_FIELDS = [
  ['brand_name', 'Brand Name', 'text', true], ['generic_name', 'Generic Name'], ['composition', 'Composition'],
  ['strength', 'Strength'], ['dosage_form', 'Dosage Form', 'select', false, ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Suspension', 'Drops', 'Cream', 'Ointment', 'Sachet', 'Inhaler', 'Device']],
  ['therapeutic_class', 'Therapeutic Class'], ['manufacturer', 'Manufacturer'], ['distributor', 'Distributor'],
  ['registration_no', 'Registration No'], ['barcode', 'Barcode'], ['pack_size', 'Pack Size'],
  ['category', 'Category', 'select', false, ['Medicine', 'Healthcare', 'Supplement', 'Personal Care', 'Baby Care', 'Lab Supplies']],
  ['purchase_price', 'Purchase Price', 'number'], ['sale_price', 'Sale Price', 'number'], ['mrp', 'MRP', 'number'],
  ['tax_percentage', 'Tax %', 'number'], ['reorder_level', 'Reorder Level', 'number'],
  ['batch_tracking', 'Batch Tracking', 'select', false, ['Yes', 'No']], ['expiry_tracking', 'Expiry Tracking', 'select', false, ['Yes', 'No']],
  ['status', 'Status', 'select', true, ['Active', 'Inactive', 'Discontinued']],
];

const CATALOG_PRESETS = {
  'Pharmacy': [
    ['Paracetamol 500mg', 'Medicine', 'Tablet'], ['Ibuprofen 400mg', 'Medicine', 'Tablet'], ['Amoxicillin 500mg', 'Medicine', 'Capsule'], ['Azithromycin 500mg', 'Medicine', 'Tablet'],
    ['Cefixime 400mg', 'Medicine', 'Tablet'], ['Cetirizine 10mg', 'Medicine', 'Tablet'], ['Loratadine 10mg', 'Medicine', 'Tablet'], ['Omeprazole 20mg', 'Medicine', 'Capsule'],
    ['Pantoprazole 40mg', 'Medicine', 'Tablet'], ['Metformin 500mg', 'Medicine', 'Tablet'], ['Glimepiride 2mg', 'Medicine', 'Tablet'], ['Amlodipine 5mg', 'Medicine', 'Tablet'],
    ['Losartan 50mg', 'Medicine', 'Tablet'], ['Atorvastatin 20mg', 'Medicine', 'Tablet'], ['Montelukast 10mg', 'Medicine', 'Tablet'], ['Salbutamol Syrup', 'Medicine', 'Syrup'],
    ['ORS Sachet', 'Medicine', 'Sachet'], ['Vitamin C 500mg', 'Supplement', 'Tablet'], ['Calcium + Vitamin D', 'Supplement', 'Tablet'], ['Blood Pressure Monitor', 'Healthcare', 'Device'],
    ['Glucometer Strips', 'Healthcare', 'Pack'], ['Digital Thermometer', 'Healthcare', 'Device'], ['Face Mask', 'Healthcare', 'Box'], ['Hand Sanitizer', 'Personal Care', 'Bottle'],
  ],
  'Hospital': [
    ['Paracetamol 500mg', 'Medicine', 'Tablet'], ['Ceftriaxone Injection', 'Medicine', 'Injection'], ['Normal Saline 1000ml', 'Medicine', 'Bottle'], ['Dextrose 5% 500ml', 'Medicine', 'Bottle'],
    ['Disposable Syringe 5ml', 'Lab Supplies', 'Pcs'], ['Disposable Syringe 10ml', 'Lab Supplies', 'Pcs'], ['IV Cannula 22G', 'Lab Supplies', 'Pcs'], ['Cotton Roll', 'Healthcare', 'Roll'],
    ['Surgical Gloves', 'Healthcare', 'Box'], ['Bandage Roll', 'Healthcare', 'Roll'], ['ORS Sachet', 'Medicine', 'Sachet'], ['Antiseptic Solution', 'Healthcare', 'Bottle'],
  ],
  'Mobile Shop': [
    ['iPhone 15 Pro Max', 'Mobile Phones', 'Apple'], ['iPhone 15', 'Mobile Phones', 'Apple'], ['Samsung Galaxy S24 Ultra', 'Mobile Phones', 'Samsung'], ['Samsung Galaxy A15', 'Mobile Phones', 'Samsung'],
    ['Infinix Hot 40', 'Mobile Phones', 'Infinix'], ['Tecno Spark 20', 'Mobile Phones', 'Tecno'], ['Vivo Y27', 'Mobile Phones', 'Vivo'], ['Oppo A78', 'Mobile Phones', 'Oppo'],
    ['Redmi Note 13', 'Mobile Phones', 'Xiaomi'], ['Realme C67', 'Mobile Phones', 'Realme'], ['USB-C Cable', 'Accessories', 'Generic'], ['Fast Charger 25W', 'Accessories', 'Generic'],
    ['Power Bank 10000mAh', 'Accessories', 'Generic'], ['Bluetooth Handsfree', 'Accessories', 'Generic'], ['Tempered Glass', 'Accessories', 'Generic'], ['Back Cover', 'Accessories', 'Generic'],
    ['SIM Jacket', 'Accessories', 'Generic'], ['Memory Card 64GB', 'Accessories', 'Generic'], ['AirPods Case', 'Accessories', 'Apple'], ['Mobile Battery', 'Spare Parts', 'Generic'],
  ],
  'Grocery Store': [
    ['Coca Cola', 'Beverages', 'Coca Cola', 'Soft Drink', '500ml', 'Single Unit'], ['Pepsi', 'Beverages', 'Pepsi', 'Soft Drink', '500ml', 'Single Unit'], ['7UP', 'Beverages', '7UP', 'Soft Drink', '500ml', 'Single Unit'], ['Mountain Dew', 'Beverages', 'Mountain Dew', 'Soft Drink', '500ml', 'Single Unit'],
    ['Sting', 'Beverages', 'Sting', 'Energy Drink', '250ml', 'Single Unit'], ['Sprite', 'Beverages', 'Sprite', 'Soft Drink', '500ml', 'Single Unit'], ['Fanta', 'Beverages', 'Fanta', 'Soft Drink', '500ml', 'Single Unit'], ['Mirinda', 'Beverages', 'Mirinda', 'Soft Drink', '500ml', 'Single Unit'],
    ['Pakola', 'Beverages', 'Pakola', 'Soft Drink', '500ml', 'Single Unit'], ['Next Cola', 'Beverages', 'Next Cola', 'Soft Drink', '500ml', 'Single Unit'],
    ['Nestle Pure Life', 'Water', 'Nestle', 'Mineral Water', '1.5L', 'Single Unit'], ['Aquafina', 'Water', 'Aquafina', 'Mineral Water', '1.5L', 'Single Unit'], ['Kinley', 'Water', 'Kinley', 'Mineral Water', '1.5L', 'Single Unit'], ['Sufi Water', 'Water', 'Sufi', 'Mineral Water', '1.5L', 'Single Unit'], ['Gourmet Water', 'Water', 'Gourmet', 'Mineral Water', '1.5L', 'Single Unit'], ['Alhambra Water', 'Water', 'Alhambra', 'Mineral Water', '1.5L', 'Single Unit'],
    ['Nestle Fruita Vitals', 'Juices', 'Nestle', 'Juice', '1L', 'Pack'], ['Slice', 'Juices', 'Slice', 'Juice', '200ml', 'Pack'], ['Maaza', 'Juices', 'Maaza', 'Juice', '200ml', 'Pack'], ['Dayfresh Juice', 'Juices', 'Dayfresh', 'Juice', '1L', 'Pack'], ['Nurpur Juice', 'Juices', 'Nurpur', 'Juice', '1L', 'Pack'], ['Shezan', 'Juices', 'Shezan', 'Juice', '1L', 'Pack'], ['Mitchells', 'Juices', 'Mitchells', 'Juice', '1L', 'Pack'],
    ['LU', 'Biscuits', 'LU', 'Biscuits', 'Pack', 'Pack'], ['Sooper', 'Biscuits', 'Sooper', 'Biscuits', 'Pack', 'Pack'], ['Gala', 'Biscuits', 'Gala', 'Biscuits', 'Pack', 'Pack'], ['Rio', 'Biscuits', 'Rio', 'Biscuits', 'Pack', 'Pack'], ['Prince', 'Biscuits', 'Prince', 'Biscuits', 'Pack', 'Pack'], ['Candi', 'Biscuits', 'Candi', 'Biscuits', 'Pack', 'Pack'], ['Tiger', 'Biscuits', 'Tiger', 'Biscuits', 'Pack', 'Pack'], ['Click', 'Biscuits', 'Click', 'Biscuits', 'Pack', 'Pack'], ['Oreo', 'Biscuits', 'Oreo', 'Biscuits', 'Pack', 'Pack'], ['Britannia', 'Biscuits', 'Britannia', 'Biscuits', 'Pack', 'Pack'],
    ['Lays', 'Snacks', 'Lays', 'Chips', 'Pack', 'Pack'], ['Kurkure', 'Snacks', 'Kurkure', 'Chips', 'Pack', 'Pack'], ['Cheetos', 'Snacks', 'Cheetos', 'Chips', 'Pack', 'Pack'], ['Kolson Snacks', 'Snacks', 'Kolson', 'Snacks', 'Pack', 'Pack'], ['Slanty', 'Snacks', 'Slanty', 'Snacks', 'Pack', 'Pack'],
    ['Milk', 'Dairy', 'General', 'Milk', '1L', 'Pack'], ['Yogurt', 'Dairy', 'General', 'Yogurt', '500g', 'Pack'], ['Butter', 'Dairy', 'General', 'Butter', '200g', 'Pack'], ['Cream', 'Dairy', 'General', 'Cream', '200ml', 'Pack'], ['Cheese', 'Dairy', 'General', 'Cheese', 'Pack', 'Pack'],
    ['Sugar', 'Grocery', 'General', 'Staple', '1kg', 'Pack'], ['Tea', 'Grocery', 'General', 'Tea', '190g', 'Pack'], ['Rice', 'Grocery', 'General', 'Staple', '1kg', 'Pack'], ['Flour', 'Grocery', 'General', 'Staple', '10kg', 'Bag'], ['Pulses', 'Grocery', 'General', 'Staple', '1kg', 'Pack'], ['Spices', 'Grocery', 'General', 'Spices', 'Pack', 'Pack'],
    ['Candies', 'Confectionery', 'General', 'Candy', 'Pack', 'Pack'], ['Chocolates', 'Confectionery', 'General', 'Chocolate', 'Pack', 'Pack'], ['Toffees', 'Confectionery', 'General', 'Toffee', 'Pack', 'Pack'], ['Gum', 'Confectionery', 'General', 'Chewing Gum', 'Pack', 'Pack'],
    ['Soap', 'Personal Care', 'General', 'Soap', 'Single', 'Single Unit'], ['Shampoo', 'Personal Care', 'General', 'Shampoo', 'Bottle', 'Bottle'], ['Toothpaste', 'Personal Care', 'General', 'Toothpaste', 'Tube', 'Single Unit'], ['Face Wash', 'Personal Care', 'General', 'Face Wash', 'Tube', 'Single Unit'],
    ['Detergent', 'Household', 'General', 'Laundry', 'Pack', 'Pack'], ['Dish Wash', 'Household', 'General', 'Cleaning', 'Bottle', 'Bottle'], ['Tissue', 'Household', 'General', 'Tissue', 'Box', 'Box'], ['Cleaning Products', 'Household', 'General', 'Cleaning', 'Bottle', 'Bottle'],
  ],
  'General Store': [
    ['Coca Cola', 'Beverages', 'Coca Cola', 'Soft Drink', '500ml', 'Single Unit'], ['Pepsi', 'Beverages', 'Pepsi', 'Soft Drink', '500ml', 'Single Unit'], ['7UP', 'Beverages', '7UP', 'Soft Drink', '500ml', 'Single Unit'], ['Mountain Dew', 'Beverages', 'Mountain Dew', 'Soft Drink', '500ml', 'Single Unit'],
    ['Sting', 'Beverages', 'Sting', 'Energy Drink', '250ml', 'Single Unit'], ['Sprite', 'Beverages', 'Sprite', 'Soft Drink', '500ml', 'Single Unit'], ['Fanta', 'Beverages', 'Fanta', 'Soft Drink', '500ml', 'Single Unit'], ['Mirinda', 'Beverages', 'Mirinda', 'Soft Drink', '500ml', 'Single Unit'],
    ['Pakola', 'Beverages', 'Pakola', 'Soft Drink', '500ml', 'Single Unit'], ['Next Cola', 'Beverages', 'Next Cola', 'Soft Drink', '500ml', 'Single Unit'],
    ['Nestle Pure Life', 'Water', 'Nestle', 'Mineral Water', '1.5L', 'Single Unit'], ['Aquafina', 'Water', 'Aquafina', 'Mineral Water', '1.5L', 'Single Unit'], ['Kinley', 'Water', 'Kinley', 'Mineral Water', '1.5L', 'Single Unit'], ['Sufi Water', 'Water', 'Sufi', 'Mineral Water', '1.5L', 'Single Unit'], ['Gourmet Water', 'Water', 'Gourmet', 'Mineral Water', '1.5L', 'Single Unit'], ['Alhambra Water', 'Water', 'Alhambra', 'Mineral Water', '1.5L', 'Single Unit'],
    ['Nestle Fruita Vitals', 'Juices', 'Nestle', 'Juice', '1L', 'Pack'], ['Slice', 'Juices', 'Slice', 'Juice', '200ml', 'Pack'], ['Maaza', 'Juices', 'Maaza', 'Juice', '200ml', 'Pack'], ['Dayfresh Juice', 'Juices', 'Dayfresh', 'Juice', '1L', 'Pack'], ['Nurpur Juice', 'Juices', 'Nurpur', 'Juice', '1L', 'Pack'], ['Shezan', 'Juices', 'Shezan', 'Juice', '1L', 'Pack'], ['Mitchells', 'Juices', 'Mitchells', 'Juice', '1L', 'Pack'],
    ['LU', 'Biscuits', 'LU', 'Biscuits', 'Pack', 'Pack'], ['Sooper', 'Biscuits', 'Sooper', 'Biscuits', 'Pack', 'Pack'], ['Gala', 'Biscuits', 'Gala', 'Biscuits', 'Pack', 'Pack'], ['Rio', 'Biscuits', 'Rio', 'Biscuits', 'Pack', 'Pack'], ['Prince', 'Biscuits', 'Prince', 'Biscuits', 'Pack', 'Pack'], ['Candi', 'Biscuits', 'Candi', 'Biscuits', 'Pack', 'Pack'], ['Tiger', 'Biscuits', 'Tiger', 'Biscuits', 'Pack', 'Pack'], ['Click', 'Biscuits', 'Click', 'Biscuits', 'Pack', 'Pack'], ['Oreo', 'Biscuits', 'Oreo', 'Biscuits', 'Pack', 'Pack'], ['Britannia', 'Biscuits', 'Britannia', 'Biscuits', 'Pack', 'Pack'],
    ['Lays', 'Snacks', 'Lays', 'Chips', 'Pack', 'Pack'], ['Kurkure', 'Snacks', 'Kurkure', 'Chips', 'Pack', 'Pack'], ['Cheetos', 'Snacks', 'Cheetos', 'Chips', 'Pack', 'Pack'], ['Kolson Snacks', 'Snacks', 'Kolson', 'Snacks', 'Pack', 'Pack'], ['Slanty', 'Snacks', 'Slanty', 'Snacks', 'Pack', 'Pack'],
    ['Milk', 'Dairy', 'General', 'Milk', '1L', 'Pack'], ['Yogurt', 'Dairy', 'General', 'Yogurt', '500g', 'Pack'], ['Butter', 'Dairy', 'General', 'Butter', '200g', 'Pack'], ['Cream', 'Dairy', 'General', 'Cream', '200ml', 'Pack'], ['Cheese', 'Dairy', 'General', 'Cheese', 'Pack', 'Pack'],
    ['Sugar', 'Grocery', 'General', 'Staple', '1kg', 'Pack'], ['Tea', 'Grocery', 'General', 'Tea', '190g', 'Pack'], ['Rice', 'Grocery', 'General', 'Staple', '1kg', 'Pack'], ['Flour', 'Grocery', 'General', 'Staple', '10kg', 'Bag'], ['Pulses', 'Grocery', 'General', 'Staple', '1kg', 'Pack'], ['Spices', 'Grocery', 'General', 'Spices', 'Pack', 'Pack'],
    ['Candies', 'Confectionery', 'General', 'Candy', 'Pack', 'Pack'], ['Chocolates', 'Confectionery', 'General', 'Chocolate', 'Pack', 'Pack'], ['Toffees', 'Confectionery', 'General', 'Toffee', 'Pack', 'Pack'], ['Gum', 'Confectionery', 'General', 'Chewing Gum', 'Pack', 'Pack'],
    ['Soap', 'Personal Care', 'General', 'Soap', 'Single', 'Single Unit'], ['Shampoo', 'Personal Care', 'General', 'Shampoo', 'Bottle', 'Bottle'], ['Toothpaste', 'Personal Care', 'General', 'Toothpaste', 'Tube', 'Single Unit'], ['Face Wash', 'Personal Care', 'General', 'Face Wash', 'Tube', 'Single Unit'],
    ['Detergent', 'Household', 'General', 'Laundry', 'Pack', 'Pack'], ['Dish Wash', 'Household', 'General', 'Cleaning', 'Bottle', 'Bottle'], ['Tissue', 'Household', 'General', 'Tissue', 'Box', 'Box'], ['Cleaning Products', 'Household', 'General', 'Cleaning', 'Bottle', 'Bottle'],
  ],
  Traders: [
    ['Coca Cola 500ml', 'Beverages', 'Coca Cola', 'Soft Drink', '500ml', 'Carton'],
    ['Sprite 500ml', 'Beverages', 'Sprite', 'Soft Drink', '500ml', 'Carton'],
    ['Fanta 500ml', 'Beverages', 'Fanta', 'Soft Drink', '500ml', 'Carton'],
    ['Pepsi 500ml', 'Beverages', 'Pepsi', 'Soft Drink', '500ml', 'Carton'],
    ['Mountain Dew 500ml', 'Beverages', 'Mountain Dew', 'Soft Drink', '500ml', 'Carton'],
    ['Aquafina 1.5L', 'Water', 'Aquafina', 'Mineral Water', '1.5L', 'Carton'],
    ['Nestle Pure Life 1.5L', 'Water', 'Nestle', 'Mineral Water', '1.5L', 'Carton'],
    ['Nestle Fruita Vitals 1L', 'Juices', 'Nestle', 'Juice', '1L', 'Carton'],
    ['Shezan Juice 1L', 'Juices', 'Shezan', 'Juice', '1L', 'Carton'],
    ['Mitchells Squash', 'Juices', 'Mitchells', 'Squash', 'Bottle', 'Carton'],
    ['Olpers Milk 1L', 'Dairy', 'OLPERS', 'Milk', '1L', 'Carton'],
    ['National Foods Masala', 'Grocery', 'National Foods', 'Spices', 'Pack', 'Box'],
  ],
  'Electronics Store': [
    ['LED Bulb 12W', 'Electronics', 'Generic'], ['Extension Lead', 'Electronics', 'Generic'], ['HDMI Cable', 'Accessories', 'Generic'], ['Remote Control', 'Accessories', 'Generic'],
  ],
  'Clothing Store': [
    ['Men Shirt', 'Clothing', 'Generic'], ['Ladies Suit', 'Clothing', 'Generic'], ['Kids T-Shirt', 'Clothing', 'Generic'], ['Socks Pair', 'Accessories', 'Generic'],
  ],
  'Hardware Store': [
    ['Screw Driver', 'Tools', 'Generic'], ['Pliers', 'Tools', 'Generic'], ['PVC Pipe', 'Plumbing', 'Generic'], ['Electric Wire Roll', 'Electrical', 'Generic'],
  ],
  'Shopping Mall': [
    ['Grocery Item', 'Grocery', 'General'], ['Electronics Item', 'Electronics', 'Generic'], ['Clothing Item', 'Clothing', 'Generic'], ['Household Item', 'Household', 'Generic'],
  ],
};

const ADMIN_USER = true;

const MODULE_LABELS = {
  'Customer Management': 'Customer',
  'Supplier Management': 'Supplier',
  'Expense Management': 'Expense',
  'Repair Management': 'Repair',
  'User Management': 'User',
  'Patient Management': 'Patient',
  'Assistant Management': 'Assistant',
  'Master Catalog': 'Catalog Item',
  'Sales Record': 'Sale',
  'Manual Repair Receipt': 'Repair Receipt',
  'Admin Panel Settings': 'Admin Setting',
};

const DEFAULT_RECORDS = {
  'Expense Management': () => ({ spent_at: new Date().toISOString().slice(0, 10) }),
  'Repair Management': () => ({ status: 'Received' }),
  'User Management': () => ({ status: 'Active', role: 'Cashier' }),
  'Patient Management': () => ({ status: 'Waiting', visit_date: new Date().toISOString().slice(0, 10) }),
  'Assistant Management': () => ({ status: 'Active', role: 'Compounder' }),
};

const HOSPITAL_REMOTE_STORES = [
  'users',
  'patients', 'assistants', 'hospital_prescriptions', 'hospital_orders',
  'hospital_tasks', 'lab_reports', 'radiology_reports', 'hospital_bills', 'hospital_bill_items',
];

const MOBILE_SHOP_REMOTE_STORES = [
  'products', 'customers', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'inventory_transactions', 'cashbook', 'customer_ledgers', 'supplier_ledgers',
  'imei_registry', 'imei_movements', 'warranty_claims', 'sale_returns', 'sale_return_items',
  'purchase_returns', 'purchase_return_items',
];

const TRADERS_REMOTE_STORES = [
  'products', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'inventory_transactions', 'cashbook', 'trader_companies', 'trader_brands',
  'trader_territories', 'trader_routes', 'trader_salesmen', 'trader_retailers',
  'trader_delivery_challans', 'trader_recoveries', 'trader_salesman_ledgers',
  'trader_distributor_ledgers', 'master_catalogs',
];

const HEADER_LABELS = {
  product_name: 'Product Name',
  imei: 'IMEI / Serial',
  sku: 'SKU',
  unit: 'Unit',
  package_quantity: 'Boxes / Packs',
  units_per_package: 'Pcs Per Box',
  loose_quantity: 'Loose Pcs',
  package_cost_price: 'Cost Per Box',
  total_cost: 'Total Cost',
  packaging_view: 'Packaging View',
  selected_unit: 'Unit',
  unit_conversion: 'Contains',
  stock_quantity: 'Stock Impact',
  available_stock: 'Available Stock',
  price: 'Unit Price',
  conversion_factor: 'Contains',
  line_total: 'Line Total',
  batch_number: 'Batch',
  expiry_date: 'Expiry',
  manufacturer: 'Manufacturer',
  purchase_price: 'Cost / Pc',
  sale_price: 'Sale / Pc',
  quantity: 'Stock',
  low_stock_threshold: 'Low Stock Limit',
  total_spent: 'Total Spent',
  customer_name: 'Customer',
  business_type: 'Shop Type',
  supplier_name: 'Supplier',
  invoice_number: 'Invoice No',
  receipt_number: 'Receipt No',
  job_number: 'Job No',
  device_name: 'Device',
  repair_charges: 'Repair Charges',
  advance_payment: 'Advance',
  remaining_amount: 'Remaining',
  provider: 'Provider',
  available: 'Available',
  cash_in: 'Cash In',
  sent: 'Sent',
  pending: 'Pending',
  fee_profit: 'Fee Profit',
  reference_number: 'Transaction ID',
  transacted_at: 'Date',
  patient_name: 'Patient',
  doctor_name: 'Doctor',
  assistant_name: 'Assistant',
  visit_date: 'Visit Date',
  next_visit: 'Next Visit',
  medicine_days: 'Medicine Days',
  diagnosis: 'Diagnosis',
  medicine: 'Prescription',
};

function App() {
  const [active, setActive] = useState('dashboard');
  const [auth, setAuth] = useState(() => ({
    token: localStorage.getItem('dsh_token') || '',
    user: localStorage.getItem('dsh_user_name') || '',
    role: localStorage.getItem('dsh_user_role') || '',
  }));
  const [dark, setDark] = useState(() => localStorage.getItem('msm_theme') === 'dark');
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState({});
  const [snapshot, setSnapshot] = useState(null);
  const [brand, setBrand] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState('');

  const authenticated = Boolean(auth.token);
  const role = auth.role || 'Cashier';
  const allowedModules = useMemo(() => modulesForBusiness(MODULES.filter((item) => (ROLE_MODULES[role] || ROLE_MODULES.Cashier).includes(item.id)), brand, role), [role, brand]);

  async function refresh() {
    await cleanupStartupData();
    await hydrateSessionSettings();
    if (auth.token && navigator.onLine) await syncNow();
    if (auth.token && navigator.onLine && (brand?.business_type === 'Hospital' || localStorage.getItem('dsh_business_type') === 'Hospital')) {
      await hydrateRemoteStores(HOSPITAL_REMOTE_STORES);
    }
    if (auth.token && navigator.onLine && (brand?.business_type === 'Mobile Shop' || localStorage.getItem('dsh_business_type') === 'Mobile Shop')) {
      await hydrateRemoteStores(MOBILE_SHOP_REMOTE_STORES);
    }
    if (auth.token && navigator.onLine && businessTypeKey(brand?.business_type || localStorage.getItem('dsh_business_type')) === 'traders') {
      await hydrateRemoteStores(TRADERS_REMOTE_STORES);
    }
    const stores = ['products', 'customers', 'suppliers', 'sales', 'sale_items', 'purchases', 'purchase_items', 'expenses', 'repairs', 'repair_updates', 'manual_repair_receipts', 'mobile_wallet_transactions', 'patients', 'assistants', 'hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports', 'radiology_reports', 'hospital_bills', 'hospital_bill_items', 'master_catalogs', 'medicines', 'payments', 'cashbook', 'users', 'settings', 'notifications', 'licenses', 'audit_logs', 'inventory_transactions', 'customer_ledgers', 'supplier_ledgers', 'imei_registry', 'imei_movements', 'warranty_claims', 'sale_returns', 'sale_return_items', 'purchase_returns', 'purchase_return_items', 'trader_companies', 'trader_brands', 'trader_territories', 'trader_routes', 'trader_salesmen', 'trader_retailers', 'trader_delivery_challans', 'trader_recoveries', 'trader_salesman_ledgers', 'trader_distributor_ledgers', 'sync_queue'];
    const entries = await Promise.all(stores.map(async (store) => [store, await listRecords(store)]));
    const currentBrand = await getBrandSettings();
    setData(Object.fromEntries(entries));
    setSnapshot(await dashboardSnapshot());
    setBrand(currentBrand);
    window.__msmBrand = currentBrand;
    setRefreshKey((value) => value + 1);
  }

  async function hydrateSessionSettings() {
    if (!auth.token) return;
    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${auth.token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.ok && payload.settings) {
        await saveBrandSettings(payload.settings);
        const sessionUser = payload.user || {};
        const roleName = userRole(sessionUser);
        localStorage.setItem('dsh_license_uuid', payload.settings.license_uuid || sessionUser.license_uuid || '');
        localStorage.setItem('dsh_business_type', payload.settings.business_type || sessionUser.business_type || '');
        if (roleName && roleName !== auth.role) {
          localStorage.setItem('dsh_user_role', roleName);
          setAuth((current) => ({ ...current, role: roleName, user: sessionUser.name || current.user }));
        }
      }
    } catch {
      // Keep local settings when the server is unavailable.
    }
  }

  useEffect(() => {
    navigator.serviceWorker?.register('/sw.js');
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (authenticated) refresh();
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const timer = window.setInterval(() => {
      if (navigator.onLine) refresh();
    }, brand?.business_type === 'Hospital' || localStorage.getItem('dsh_business_type') === 'Hospital' ? 5000 : 12000);
    return () => window.clearInterval(timer);
  }, [authenticated, auth.token]);

  useEffect(() => {
    if (authenticated && allowedModules.length && !allowedModules.some((item) => item.id === active)) {
      setActive(allowedModules[0].id);
    }
  }, [authenticated, allowedModules, active]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const handler = () => {
      window.clearTimeout(window.__msmRefreshTimer);
      window.__msmRefreshTimer = window.setTimeout(() => refresh(), 120);
    };
    window.addEventListener('msm:record-deleted', handler);
    window.addEventListener('msm:record-delete-synced', handler);
    window.addEventListener('msm:product-saved', handler);
    window.addEventListener('msm:inventory-refresh', handler);
    window.addEventListener('msm:dashboard-refresh', handler);
    return () => {
      window.removeEventListener('msm:record-deleted', handler);
      window.removeEventListener('msm:record-delete-synced', handler);
      window.removeEventListener('msm:product-saved', handler);
      window.removeEventListener('msm:inventory-refresh', handler);
      window.removeEventListener('msm:dashboard-refresh', handler);
    };
  }, [authenticated, auth.token]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('msm_theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    const handler = (event) => {
      setToast(event.detail || 'Saved successfully');
      window.clearTimeout(window.__dshToastTimer);
      window.__dshToastTimer = window.setTimeout(() => setToast(''), 2400);
    };
    window.addEventListener('dsh:toast', handler);
    return () => window.removeEventListener('dsh:toast', handler);
  }, []);

  async function handleSync() {
    setSyncing(true);
    await syncNow();
    await refresh();
    setSyncing(false);
  }

  function handleLogin(session) {
    const roleName = userRole(session.user);
    const licenseUuid = session.settings?.license_uuid || session.user?.license_uuid || session.license?.uuid || '';
    const businessType = session.settings?.business_type || session.user?.business_type || session.license?.business_type || '';
    localStorage.setItem('dsh_token', session.token);
    localStorage.setItem('dsh_user_name', session.user?.name || session.user?.email || 'User');
    localStorage.setItem('dsh_user_role', roleName);
    localStorage.setItem('dsh_license_uuid', licenseUuid);
    localStorage.setItem('dsh_business_type', businessType);
    setAuth({ token: session.token, user: session.user?.name || session.user?.email || 'User', role: roleName });
    if (session.settings) {
      saveBrandSettings(session.settings).then(refresh);
      window.__msmBrand = session.settings;
    }
  }

  function handleLogout() {
    localStorage.removeItem('dsh_token');
    localStorage.removeItem('dsh_user_name');
    localStorage.removeItem('dsh_user_role');
    localStorage.removeItem('dsh_license_uuid');
    localStorage.removeItem('dsh_business_type');
    setAuth({ token: '', user: '', role: '' });
    setData({});
    setSnapshot(null);
  }

  if (!authenticated) {
    return <LoginScreen brand={brand} onLogin={handleLogin} />;
  }

  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-[#182322] dark:text-[#eef7f2]" style={{ '--accent': brand?.theme_color || '#14B8A6' }}>
      <aside className="sidebar">
        <div className="brand-block">{brand?.logo ? <img src={brand.logo} alt="" /> : <span>{initials(brand?.shop_name || brand?.company_name || 'MS')}</span>}<div><strong>{brand?.software_name || 'Market Sales'}</strong><small>{brand?.shop_name || brand?.company_name || 'Retail Admin Panel'}</small></div></div>
        <nav>{allowedModules.map((item) => <NavButton key={item.id} item={item} active={active === item.id} onClick={() => setActive(item.id)} />)}</nav>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div><h1>{allowedModules.find((item) => item.id === active)?.label}</h1><p>{brand?.shop_name || brand?.company_name || 'Retail Shop'} - {brand?.business_type || 'General Store'} - {auth.user} ({role})</p></div>
          <div className="top-actions">
            <StatusPill online={online} syncing={syncing} />
            <button className="icon-btn" onClick={handleSync} title="Sync now"><Cloud size={18} /></button>
            <button className="icon-btn" onClick={() => setDark((value) => !value)} title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-btn" onClick={handleLogout} title={`Logout ${auth.user || ''}`}><LogOut size={18} /></button>
          </div>
        </header>
        <div className="content">
          {active === 'dashboard' && <Dashboard snapshot={snapshot} data={data} brand={brand} auth={auth} refresh={refresh} />}
          {active === 'pos' && <POS2 data={data} brand={brand} refresh={refresh} />}
          {active === 'sales' && <Sales rows={data.sales || []} brand={brand} refresh={refresh} />}
          {active === 'products' && <Inventory rows={data.products || []} brand={brand} refresh={refresh} />}
          {active === 'customers' && <CrudModule config={RESOURCES.customers} rows={data.customers || []} refresh={refresh} extraActions={(row) => <button className="ghost-btn" onClick={() => printLedger(row, data.customer_ledgers || [])}><Printer size={15} /> Ledger</button>} />}
          {active === 'credit' && <Credit data={data} refresh={refresh} />}
          {active === 'mobileWallets' && <CrudModule config={RESOURCES.mobile_wallet_transactions} rows={data.mobile_wallet_transactions || []} refresh={refresh} />}
          {active === 'repairs' && <Repairs rows={data.repairs || []} refresh={refresh} />}
          {active === 'repairReceipts' && <ManualRepairReceipts rows={data.manual_repair_receipts || []} brand={brand} refresh={refresh} />}
          {active === 'warrantyClaims' && <CrudModule config={RESOURCES.warranty_claims} rows={data.warranty_claims || []} refresh={refresh} />}
          {active === 'returns' && <ReturnsModule data={data} refresh={refresh} />}
          {active === 'traderCompanies' && <CrudModule config={RESOURCES.trader_companies} rows={data.trader_companies || []} refresh={refresh} />}
          {active === 'traderBrands' && <CrudModule config={RESOURCES.trader_brands} rows={data.trader_brands || []} refresh={refresh} />}
          {active === 'traderTerritories' && <CrudModule config={RESOURCES.trader_territories} rows={data.trader_territories || []} refresh={refresh} />}
          {active === 'traderRoutes' && <CrudModule config={RESOURCES.trader_routes} rows={data.trader_routes || []} refresh={refresh} />}
          {active === 'traderSalesmen' && <CrudModule config={RESOURCES.trader_salesmen} rows={data.trader_salesmen || []} refresh={refresh} />}
          {active === 'traderRetailers' && <CrudModule config={RESOURCES.trader_retailers} rows={data.trader_retailers || []} refresh={refresh} />}
          {active === 'traderChallans' && <CrudModule config={RESOURCES.trader_delivery_challans} rows={data.trader_delivery_challans || []} refresh={refresh} />}
          {active === 'traderRecoveries' && <CrudModule config={RESOURCES.trader_recoveries} rows={data.trader_recoveries || []} refresh={refresh} />}
          {active === 'traderSalesmanLedger' && <CrudModule config={RESOURCES.trader_salesman_ledgers} rows={data.trader_salesman_ledgers || []} refresh={refresh} />}
          {active === 'traderDistributorLedger' && <CrudModule config={RESOURCES.trader_distributor_ledgers} rows={data.trader_distributor_ledgers || []} refresh={refresh} />}
          {active === 'purchases' && <Purchases data={data} refresh={refresh} />}
          {active === 'suppliers' && <CrudModule config={RESOURCES.suppliers} rows={data.suppliers || []} refresh={refresh} extraActions={(row) => <button className="ghost-btn" onClick={() => printLedger(row, data.supplier_ledgers || [], 'supplier_uuid')}><Printer size={15} /> Ledger</button>} />}
          {active === 'expenses' && <CrudModule config={RESOURCES.expenses} rows={data.expenses || []} refresh={refresh} />}
          {active === 'notifications' && <Notifications data={data} refresh={refresh} auth={auth} />}
          {active === 'accounting' && <Accounting data={data} refresh={refresh} />}
          {active === 'reports' && <Reports refreshKey={refreshKey} brand={brand} />}
          {active === 'catalog' && <CatalogModule rows={data.master_catalogs || []} products={data.products || []} brand={brand} refresh={refresh} />}
          {active === 'medicines' && <MedicinesModule rows={data.medicines || []} refresh={refresh} />}
          {active === 'backup' && <BackupModule data={data} auth={auth} brand={brand} refresh={refresh} />}
          {active === 'users' && <CrudModule config={RESOURCES.users} rows={usersForRole(data.users || [], auth)} refresh={refresh} context={{ auth, brand }} />}
          {active === 'patients' && <CrudModule config={RESOURCES.patients} rows={patientRowsForUser(data.patients || [], auth, brand)} refresh={refresh} context={{ auth, brand, assistants: assistantRowsForUser(data.assistants || [], auth, brand), catalogs: data.master_catalogs || [], medicines: data.medicines || [] }} />}
          {active === 'assistants' && <CrudModule config={RESOURCES.assistants} rows={assistantRowsForUser(data.assistants || [], auth, brand)} refresh={refresh} context={{ auth, brand }} />}
          {active === 'hospitalPharmacy' && <HospitalWorkflow title="Hospital Pharmacy" rows={data.hospital_prescriptions || []} store="hospital_prescriptions" columns={['patient_name', 'doctor_name', 'medicine_name', 'morning', 'afternoon', 'evening', 'night', 'days', 'status']} refresh={refresh} />}
          {active === 'hospitalTasks' && <HospitalWorkflow title="Injection Room / Tasks" rows={data.hospital_tasks || []} store="hospital_tasks" columns={['patient_name', 'task_type', 'task_name', 'quantity', 'assigned_role', 'status']} refresh={refresh} />}
          {active === 'labReports' && <HospitalWorkflow title="Lab Management" rows={data.lab_reports || []} store="lab_reports" columns={['token_number', 'patient_name', 'test_name', 'result', 'technician_name', 'doctor_review_status', 'status']} refresh={refresh} />}
          {active === 'radiologyReports' && <HospitalWorkflow title="Radiology" rows={data.radiology_reports || []} store="radiology_reports" columns={['token_number', 'patient_name', 'study_type', 'findings', 'impression', 'radiologist_name', 'doctor_review_status', 'status']} refresh={refresh} />}
          {active === 'hospitalBilling' && <HospitalBillingWorkflow data={data} brand={brand} refresh={refresh} />}
          {active === 'licenses' && <LicenseManager rows={data.licenses || []} refresh={refresh} />}
          {active === 'settings' && <SettingsPanel brand={brand} rows={data.settings || []} refresh={refresh} />}
        </div>
        <footer className="app-footer">{brand?.footer_branding || 'Design & Developed By DSH Digital Solutions Hub - 2026'}</footer>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function apiErrorMessage(payload = {}, fallback = 'Request failed.') {
  const validation = Object.values(payload.errors || {}).flat().filter(Boolean).join(' ');
  return validation || payload.message || fallback;
}

function LoginScreen({ brand, onLogin }) {
  const [mode, setMode] = useState('admin');
  const [form, setForm] = useState({ email: '', password: '' });
  const [activation, setActivation] = useState({ license_key: '', activation_code: '', shop_name: '', name: '', email: '', password: '', device_id: ensureDeviceId() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...form, portal: mode === 'user' ? 'user' : 'admin' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiErrorMessage(payload, 'Login failed. Check email and password.'));
      onLogin(payload);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function activate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = await activateLicenseAccount(activation);
      onLogin(payload);
    } catch (err) {
      setError(err.message || 'License activation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isLoginMode = mode === 'admin' || mode === 'user';
  const subtitle = mode === 'admin' ? 'Admin / owner secure login' : mode === 'user' ? 'Staff user login' : 'Activate shop license';
  return <main className="login-page"><section className="login-panel"><div className="login-brand"><span>{initials(brand?.shop_name || brand?.company_name || 'MS')}</span><div><strong>{brand?.software_name || 'Market Sales Management System'}</strong><small>{subtitle}</small></div></div><div className="login-tabs three"><button type="button" className={mode === 'admin' ? 'active' : ''} onClick={() => { setMode('admin'); setForm({ email: '', password: '' }); setError(''); }}>Admin Login</button><button type="button" className={mode === 'user' ? 'active' : ''} onClick={() => { setMode('user'); setForm({ email: '', password: '' }); setError(''); }}>User Login</button><button type="button" className={mode === 'activate' ? 'active' : ''} onClick={() => { setMode('activate'); setError(''); }}>Activate</button></div>{isLoginMode ? <form onSubmit={submit} className="login-form"><label>{mode === 'admin' ? 'Admin Email' : 'User Email'}<input type="email" required placeholder={mode === 'admin' ? 'admin@example.com' : 'cashier@example.com'} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Password<input type="password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="login-error">{error}</p>}<button className="primary-btn" disabled={loading}>{loading ? 'Signing in...' : mode === 'admin' ? 'Admin Login' : 'User Login'}</button></form> : <form onSubmit={activate} className="login-form"><label>License Key<input required value={activation.license_key} onChange={(event) => setActivation({ ...activation, license_key: event.target.value })} /></label><label>Activation Code<input required value={activation.activation_code} onChange={(event) => setActivation({ ...activation, activation_code: event.target.value })} /></label><label>Shop Name<input required value={activation.shop_name} onChange={(event) => setActivation({ ...activation, shop_name: event.target.value })} /></label><label>Admin Name<input required value={activation.name} onChange={(event) => setActivation({ ...activation, name: event.target.value })} /></label><label>Admin Email<input type="email" required value={activation.email} onChange={(event) => setActivation({ ...activation, email: event.target.value })} /></label><label>Password<input type="password" required minLength={6} value={activation.password} onChange={(event) => setActivation({ ...activation, password: event.target.value })} /></label><label>Device Binding<input value={activation.device_id} onChange={(event) => setActivation({ ...activation, device_id: event.target.value })} /></label>{error && <p className="login-error">{error}</p>}<button className="primary-btn" disabled={loading}>{loading ? 'Activating...' : 'Activate & Login'}</button></form>}</section></main>;
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return <button className={`nav-btn ${active ? 'nav-btn-active' : ''}`} onClick={onClick}><Icon size={18} /><span>{item.label}</span></button>;
}

function StatusPill({ online, syncing }) {
  const label = syncing ? 'Syncing' : online ? 'Online' : 'Offline';
  return <span className={`status-pill ${online ? 'ok' : 'bad'}`}>{online ? <Cloud size={15} /> : <CloudOff size={15} />} {label}</span>;
}

function inventoryRows(rows) {
  return rows.map((row) => {
    const qty = Number(row.quantity || 0);
    const threshold = Number(row.low_stock_threshold || 3);
    return {
      ...row,
      display_name: productDisplayName(row),
      packaging_view: stockPackagingView(row),
      imei: row.imei || row.barcode || row.serial || '',
      status: qty <= 0 ? 'Out of Stock' : qty <= threshold ? 'Low Stock' : 'In Stock',
    };
  });
}

function productDisplayName(record = {}) {
  const baseName = record.product_name || record.name || record.brand_name || record.generic_name || record.model || '';
  const medicineRecord = Boolean(record.brand_name || record.generic_name || record.dosage_form);
  const parts = [];
  const add = (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    const normalized = text.toLowerCase();
    const genericUnits = new Set(['single unit', 'unit', 'pcs', 'pc', 'piece', 'pieces']);
    if (genericUnits.has(normalized) && parts.length) return;
    if (parts.some((part) => part.toLowerCase() === normalized)) return;
    if (parts.some((part) => part.toLowerCase().includes(normalized)) && normalized.length > 2) return;
    if (parts.some((part) => normalized.includes(part.toLowerCase()) && part.length > 2)) {
      for (let index = parts.length - 1; index >= 0; index -= 1) {
        if (normalized.includes(parts[index].toLowerCase()) && parts[index].length > 2) parts.splice(index, 1);
      }
    }
    parts.push(text);
  };

  add(record.brand || record.manufacturer);
  add(baseName);
  add(record.model);
  add(record.storage || record.memory);
  add(record.color);
  add(record.pack_size || record.strength);
  if (medicineRecord) add(record.dosage_form);
  add(record.variant || record.variant_name);

  return parts.join(' ') || 'Product';
}

function saleLineDisplayName(record = {}) {
  const base = productDisplayName(record);
  return base;
}

function lineQuantityLabel(item = {}) {
  const quantity = Number(item.quantity || 0);
  const unit = quantity === 1 ? (item.selected_unit || item.selling_unit || '') : pluralUnit(item.selected_unit || item.selling_unit || '');
  return `${quantity} ${unit}`.trim();
}

function lineUnitLabel(item = {}) {
  return item.selected_unit || item.selling_unit || '';
}

function lineConversionLabel(item = {}) {
  const factor = Math.max(1, Number(item.conversion_factor || item.factor || 1));
  const unit = lineUnitLabel(item);
  const match = String(unit || '').match(/\(([^)]+)\)/);
  if (match?.[1]) return match[1];
  const base = item.base_unit || item.unit_base || item.inventory_unit || 'Piece';
  if (factor <= 1) return `1 ${singularUnit(base)}`;
  return `${factor} ${pluralUnit(base)}`;
}

function lineTotal(item = {}) {
  return Number(item.quantity || 0) * Number(item.price || item.rate || 0);
}

function lineStockQuantity(item = {}) {
  return Math.max(1, Number(item.stock_quantity || 0) || (Number(item.quantity || 1) * Number(item.conversion_factor || 1)));
}

function broadcastInventoryRefresh(detail = {}) {
  window.dispatchEvent(new CustomEvent('msm:inventory-refresh', { detail }));
  window.dispatchEvent(new CustomEvent('msm:dashboard-refresh', { detail }));
}

function packagingUnits(product = {}) {
  const parsed = parsePackagingUnits(product.packaging_units);
  const baseUnit = productBaseUnit(product);
  const base = {
    key: 'base',
    label: baseUnit,
    unit: baseUnit,
    factor: 1,
    sale_price: Number(product.sale_price || product.unit_sale_price || 0),
    purchase_price: Number(product.purchase_price || product.unit_cost_price || 0),
    barcode: product.barcode || product.secondary_barcode || product.qr_code || product.sku || '',
    base_unit: baseUnit,
  };
  const normalizedParsed = hierarchyPackagingUnits(parsed, base);
  const derived = [
    product.box_barcode || product.units_per_box ? {
      key: 'box',
      label: `Box (${Math.max(1, Number(product.units_per_box || product.units_per_package || 1))} ${pluralUnit(baseUnit)})`,
      unit: 'Box',
      factor: Math.max(1, Number(product.units_per_box || product.units_per_package || 1)),
      sale_price: Number(product.box_sale_price || product.package_sale_price || 0) || Number(base.sale_price || 0) * Math.max(1, Number(product.units_per_box || product.units_per_package || 1)),
      purchase_price: Number(product.box_purchase_price || product.package_cost_price || 0) || Number(base.purchase_price || 0) * Math.max(1, Number(product.units_per_box || product.units_per_package || 1)),
      barcode: product.box_barcode || '',
    } : null,
    product.carton_barcode || product.units_per_carton ? {
      key: 'carton',
      label: `Carton (${Math.max(1, Number(product.units_per_carton || product.units_per_package || 1))} ${pluralUnit(baseUnit)})`,
      unit: 'Carton',
      factor: Math.max(1, Number(product.units_per_carton || product.units_per_package || 1)),
      sale_price: Number(product.carton_sale_price || 0) || Number(base.sale_price || 0) * Math.max(1, Number(product.units_per_carton || product.units_per_package || 1)),
      purchase_price: Number(product.carton_purchase_price || 0) || Number(base.purchase_price || 0) * Math.max(1, Number(product.units_per_carton || product.units_per_package || 1)),
      barcode: product.carton_barcode || '',
    } : null,
  ].filter(Boolean);
  return [base, ...normalizedParsed, ...derived].map((unit) => normalizePackagingUnit(unit, base)).filter((unit, index, rows) => rows.findIndex((item) => item.key === unit.key || (item.barcode && item.barcode === unit.barcode)) === index);
}

function parsePackagingUnits(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.units)) return value.units;
    if (Array.isArray(value.levels)) return value.levels;
    if (Array.isArray(value.packaging_units)) return value.packaging_units;
    return [];
  }
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.units)) return parsed.units;
    if (Array.isArray(parsed?.levels)) return parsed.levels;
    if (Array.isArray(parsed?.packaging_units)) return parsed.packaging_units;
    return [];
  } catch {
    return [];
  }
}

function normalizePackagingUnit(unit = {}, base = {}) {
  const factor = Math.max(1, Number(unit.stock_factor || unit.conversion_factor || unit.factor || unit.conversion_quantity || unit.contains_quantity || unit.contains || unit.qty || 1));
  const rawLabel = unit.label || unit.name || unit.unit_name || unit.unit || 'Piece';
  const label = String(rawLabel).trim() || 'Piece';
  const baseUnit = base.unit || base.base_unit || 'Piece';
  const unitName = unit.unit || unit.unit_name || label.replace(/\s*\(.*/, '');
  return {
    key: String(unit.key || unitName || label).toLowerCase().replaceAll(' ', '_'),
    label: factor > 1 && !String(label).includes('(') ? `${label} (${factor} ${pluralUnit(baseUnit)})` : label,
    unit: unitName,
    factor,
    sale_price: Number(unit.sale_price || unit.unit_sale_price || unit.price || unit.default_price || 0) || Number(base.sale_price || 0) * factor,
    purchase_price: Number(unit.purchase_price || unit.unit_cost_price || unit.cost_price || unit.default_cost || 0) || Number(base.purchase_price || 0) * factor,
    barcode: unit.barcode || unit.secondary_barcode || unit.qr_code || unit.code || '',
    base_unit: baseUnit,
  };
}

function hierarchyPackagingUnits(units = [], base = {}) {
  const rows = units.map((unit, index) => ({
    ...unit,
    key: String(unit.key || unit.unit || unit.unit_name || unit.label || `level_${index + 1}`).toLowerCase().replaceAll(' ', '_'),
    parent_key: String(unit.parent_key || unit.parent || unit.contains_unit || 'base').toLowerCase().replaceAll(' ', '_'),
    conversion_quantity: Math.max(1, Number(unit.conversion_quantity || unit.contains_quantity || unit.contains || unit.qty || unit.factor || unit.conversion_factor || unit.stock_factor || 1)),
  }));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const factorFor = (row, seen = new Set()) => {
    if (!row || row.key === 'base' || seen.has(row.key)) return 1;
    seen.add(row.key);
    const parentFactor = row.parent_key === 'base' ? 1 : factorFor(byKey.get(row.parent_key), seen);
    return Math.max(1, Number(row.conversion_quantity || 1)) * parentFactor;
  };
  return rows.map((row) => ({
    ...row,
    factor: factorFor(row),
    conversion_factor: factorFor(row),
    label: row.label || `${row.unit || row.unit_name || row.name || row.key} (${factorFor(row)} ${pluralUnit(base.unit || 'Piece')})`,
  }));
}

function pluralUnit(unit = 'Piece') {
  const text = String(unit || 'Piece').replace(/\s*\(.*/, '');
  return text.toLowerCase().endsWith('s') ? text : `${text}s`;
}

function singularUnit(unit = 'Piece') {
  const text = String(unit || 'Piece').replace(/\s*\(.*/, '').trim() || 'Piece';
  return text.toLowerCase().endsWith('s') && text.length > 1 ? text.slice(0, -1) : text;
}

function productBaseUnit(product = {}) {
  return product.unit && !['Single Unit', 'Unit'].includes(product.unit) ? product.unit : product.variant_type || 'Piece';
}

function stockAvailableLabel(product = {}) {
  return stockPackagingView(product) || `${Number(product.quantity || 0)} ${pluralUnit(productBaseUnit(product))}`;
}

function unitForMatch(product = {}, match = {}) {
  const units = packagingUnits(product);
  const type = String(match.match_type || '').toLowerCase();
  if (match.packaging_unit?.key) {
    const matchedUnit = units.find((unit) => unit.key === match.packaging_unit.key || unit.barcode === match.packaging_unit.barcode);
    if (matchedUnit) return matchedUnit;
  }
  const matched = units.find((unit) => {
    if (type.includes(unit.key)) return true;
    if (unit.barcode && normalizeScanValue(unit.barcode) === normalizeScanValue(match.scan)) return true;
    return false;
  });
  return matched || units[0];
}

function stockPackagingBreakdown(product = {}) {
  const total = Math.max(0, Math.floor(Number(product.quantity || 0)));
  const units = packagingUnits(product).filter((unit) => Number(unit.factor || 1) > 1).sort((a, b) => Number(b.factor || 1) - Number(a.factor || 1));
  const baseUnit = productBaseUnit(product);
  if (!units.length || total === 0) return { base: total, text: `${total} ${pluralUnit(baseUnit)}` };
  const parts = units.map((unit) => {
    const factor = Math.max(1, Number(unit.factor || 1));
    const count = Math.floor(total / factor);
    const loose = total % factor;
    return `${count} ${pluralUnit(unit.unit || unit.label)}${loose ? ` + ${loose} ${pluralUnit(baseUnit)}` : ''}`;
  }).filter(Boolean);
  let remaining = total;
  const largestParts = [];
  for (const unit of units) {
    const factor = Math.max(1, Number(unit.factor || 1));
    const count = Math.floor(remaining / factor);
    if (count > 0) {
      largestParts.push(`${count} ${pluralUnit(unit.unit || unit.label)}`);
      remaining -= count * factor;
    }
  }
  if (remaining > 0) parts.push(`${remaining} ${pluralUnit(baseUnit)}`);
  return { base: total, text: largestParts.concat(remaining > 0 ? [`${remaining} ${pluralUnit(baseUnit)}`] : []).join(' '), equivalents: parts.join(' / ') };
}

function stockPackagingView(product = {}) {
  const breakdown = stockPackagingBreakdown(product);
  const baseUnit = productBaseUnit(product);
  return `${breakdown.base} ${pluralUnit(baseUnit)} | ${breakdown.text}${breakdown.equivalents ? ` | ${breakdown.equivalents}` : ''}`;
}

function normalizeScanValue(value) {
  return String(value || '').trim().toLowerCase();
}

function sameDayLocal(value) {
  return String(value || '').slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function groupDashboardRows(rows, key) {
  return Object.values((rows || []).reduce((acc, row) => {
    const name = row[key] || 'Unassigned';
    acc[name] ||= { uuid: name, name, total: 0, count: 0 };
    acc[name].total += Number(row.total || row.amount || 0);
    acc[name].count += 1;
    return acc;
  }, {})).sort((a, b) => b.total - a.total);
}

function topByMoney(rows, key) {
  return groupDashboardRows(rows, key)[0]?.name || 'No Data Available';
}

function salesTodayTotal(sales = []) {
  return sales.filter((sale) => sameDayLocal(sale.sold_at || sale.created_at)).reduce((sum, sale) => sum + Number(sale.total || 0), 0);
}

function sameMonthLocal(value) {
  return String(value || '').slice(0, 7) === new Date().toISOString().slice(0, 7);
}

function dashboardFinancialMetrics(data = {}) {
  const sales = data.sales || [];
  const paidHospitalBills = (data.hospital_bills || []).filter((bill) => ['Paid', 'Closed'].includes(bill.status) || Number(bill.paid || bill.paid_amount || 0) > 0);
  const salesToday = salesTodayTotal(sales) + paidHospitalBills.filter((bill) => sameDayLocal(bill.received_at || bill.updated_at || bill.created_at)).reduce((sum, bill) => sum + Number(bill.paid_amount || bill.paid || bill.grand_total || 0), 0);
  const salesThisMonth = sales.filter((sale) => sameMonthLocal(sale.sold_at || sale.created_at)).reduce((sum, sale) => sum + Number(sale.total || 0), 0)
    + paidHospitalBills.filter((bill) => sameMonthLocal(bill.received_at || bill.updated_at || bill.created_at)).reduce((sum, bill) => sum + Number(bill.paid_amount || bill.paid || bill.grand_total || 0), 0);
  const grossProfit = sales.reduce((sum, sale) => sum + Number(sale.profit || 0), 0);
  const expenses = (data.expenses || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const inventoryValue = (data.products || []).reduce((sum, product) => sum + Number(product.quantity || 0) * Number(product.purchase_price || product.cost_price || 0), 0);
  const cashbookBalance = (data.cashbook || []).reduce((sum, row) => sum + Number(row.debit || 0) - Number(row.credit || 0), 0);
  const cashInHand = cashbookBalance || sales.reduce((sum, sale) => sum + Number(sale.paid || 0), 0) - expenses;
  const customerReceivables = (data.customers || []).reduce((sum, customer) => sum + Number(customer.balance || 0), 0)
    + sales.reduce((sum, sale) => sum + Number(sale.balance || 0), 0)
    + (data.hospital_bills || []).reduce((sum, bill) => sum + Number(bill.balance || 0), 0);
  const supplierPayables = (data.suppliers || []).reduce((sum, supplier) => sum + Number(supplier.balance || 0), 0)
    + (data.purchases || []).reduce((sum, purchase) => sum + Number(purchase.balance || 0), 0);

  return {
    salesToday,
    salesThisMonth,
    grossProfit,
    netProfit: grossProfit - expenses,
    inventoryValue,
    cashInHand,
    customerReceivables,
    supplierPayables,
  };
}

function financialCards(data = {}) {
  const metrics = dashboardFinancialMetrics(data);
  return [
    ['Sales Today', metrics.salesToday, true],
    ['Sales This Month', metrics.salesThisMonth, true],
    ['Gross Profit', metrics.grossProfit, true],
    ['Net Profit', metrics.netProfit, true],
    ['Inventory Value', metrics.inventoryValue, true],
    ['Cash In Hand', metrics.cashInHand, true],
    ['Customer Receivables', metrics.customerReceivables, true],
    ['Supplier Payables', metrics.supplierPayables, true],
  ];
}

function inventoryOverviewCards(data = {}, snapshot = null) {
  const products = data.products || [];
  const lowStock = snapshot?.lowStock || products.filter((product) => Number(product.quantity || 0) <= Number(product.low_stock_threshold || 3));
  return [
    ['Total Products', products.length, false],
    ['Low Stock', lowStock.length, false],
    ['Inventory Qty', products.reduce((sum, product) => sum + Number(product.quantity || 0), 0), false],
    ['Active SKUs', products.filter((product) => product.status !== 'Inactive').length, false],
  ];
}

function DashboardSection({ title, children }) {
  return <section className="stack"><h2 className="section-title">{title}</h2>{children}</section>;
}

function topSellingProducts(data = {}) {
  const products = data.products || [];
  const namesByUuid = Object.fromEntries(products.map((product) => [product.uuid, productDisplayName(product)]));
  return Object.values((data.sale_items || []).reduce((acc, item) => {
    const name = item.product_name || namesByUuid[item.product_uuid] || item.name || 'Unknown Product';
    acc[name] ??= { uuid: name, product_name: name, quantity: 0, total: 0 };
    acc[name].quantity += Number(item.quantity || 0);
    acc[name].total += Number(item.total || (Number(item.quantity || 0) * Number(item.price || 0)));
    return acc;
  }, {})).sort((a, b) => b.quantity - a.quantity || b.total - a.total);
}

function expiredProducts(products = []) {
  const now = Date.now();
  return products.filter((product) => {
    if (!product.expiry_date) return false;
    const expiry = new Date(product.expiry_date).getTime();
    return Number.isFinite(expiry) && expiry < now;
  });
}

function MetricGrid({ cards }) {
  return <div className="metric-grid">{cards.map(([label, value, moneyValue = true]) => <div className="metric animated" key={label}><span>{label}</span><strong>{moneyValue === 'text' ? (value || 'No Data Available') : moneyValue ? money(value || 0) : Number(value || 0)}</strong></div>)}</div>;
}

function RetailSalesPanel({ sales }) {
  const max = Math.max(...sales.slice(0, 8).map((sale) => Number(sale.total)), 1);
  return <section className="panel"><div className="module-head"><h2>Sales Performance</h2><span className="shortcut-pill"><BarChart3 size={15} /> Last {Math.min(sales.length, 8)} invoices</span></div>{sales.length ? <SalesChart sales={sales} max={max} /> : <DashboardEmpty icon={BarChart3} title="No Sales Data Available" description="Start creating sales to see analytics." />}</section>;
}

function Dashboard({ snapshot, data, brand, auth, refresh }) {
  if (auth?.role === 'Super Admin') return <SuperAdminDashboard data={data} refresh={refresh} />;
  if (brand?.business_type === 'Hospital') return <HospitalDashboard data={data} auth={auth} brand={brand} refresh={refresh} />;
  const key = businessTypeKey(brand?.business_type || 'General Store');
  if (key === 'traders') return <TradersDashboard data={data} snapshot={snapshot} />;
  const sales = data.sales || [];
  const products = data.products || [];
  const wallets = data.mobile_wallet_transactions || [];
  const showWalletDashboard = (ROLE_MODULES[auth?.role] || ROLE_MODULES.Cashier).includes('mobileWallets');
  const lowStock = snapshot?.lowStock || [];
  const topProducts = topSellingProducts(data);
  const imeiStock = (data.imei_registry || []).filter((row) => !row.status || ['Available', 'In Stock'].includes(row.status)).length || products.reduce((sum, product) => sum + (imeiListText(product) ? imeiListText(product).split(',').length : 0), 0);
  const nearExpiry = nearExpiryProducts(products);
  const expired = expiredProducts(products);
  const businessCards = key === 'mobile_shop'
    ? [['IMEI Stock', imeiStock, false], ['Warranty Claims', (data.warranty_claims || []).length, false], ['Repairs', (data.repairs || []).length, false]]
    : key === 'pharmacy'
      ? [['Near Expiry', nearExpiry.length, false], ['Expired Medicines', expired.length, false], ['Medicines', (data.medicines || []).length, false]]
      : [['Total Products', products.length, false], ['Low Stock', lowStock.length, false], ['Top Selling Products', topProducts[0]?.product_name || 'No Data Available', 'text']];

  const businessTables = key === 'mobile_shop'
    ? <section className="split"><DashboardTable title="IMEI Stock" rows={(data.imei_registry || []).slice(0, 10)} cols={['product_name', 'imei_1', 'imei_2', 'serial_number', 'status']} emptyIcon={Smartphone} emptyTitle="No IMEI Stock" emptyDescription="Mobile IMEI stock will appear after purchases or inventory entry." /><DashboardTable title="Warranty Claims" rows={(data.warranty_claims || []).slice(0, 10)} cols={['claim_number', 'customer_name', 'product_name', 'imei_1', 'status']} emptyIcon={KeyRound} emptyTitle="No Warranty Claims" emptyDescription="Warranty claims will appear here." /></section>
    : key === 'pharmacy'
      ? <section className="split"><DashboardTable title="Near Expiry Medicines" rows={nearExpiry} cols={['product_name', 'generic_name', 'batch_number', 'expiry_date', 'quantity']} emptyIcon={Boxes} emptyTitle="No Near Expiry Medicines" emptyDescription="Medicines close to expiry will appear here." /><DashboardTable title="Expired Medicines" rows={expired} cols={['product_name', 'generic_name', 'batch_number', 'expiry_date', 'quantity']} emptyIcon={Bell} emptyTitle="No Expired Medicines" emptyDescription="Expired medicines will appear here automatically." /></section>
      : <section className="split"><DashboardTable title="Top Selling Products" rows={topProducts.slice(0, 10)} cols={['product_name', 'quantity', 'total']} emptyIcon={Boxes} emptyTitle="No Product Sales Available" emptyDescription="Top selling products will appear after sales are recorded." /><DashboardTable title="Low Stock" rows={lowStock} cols={['product_name', 'quantity', 'low_stock_threshold']} emptyIcon={Boxes} emptyTitle={products.length ? 'All Stock Levels Healthy' : 'No Inventory Data Available'} emptyDescription={products.length ? 'Products below their low stock threshold will appear here.' : 'Add inventory or receive stock to enable alerts.'} /></section>;

  return <div className="stack"><DashboardSection title="Financial Overview"><MetricGrid cards={financialCards(data)} /></DashboardSection><DashboardSection title="Inventory Overview"><MetricGrid cards={inventoryOverviewCards(data, snapshot)} /></DashboardSection><DashboardSection title="Business Metrics"><MetricGrid cards={businessCards} />{showWalletDashboard && <WalletDashboard wallets={wallets} />}{businessTables}</DashboardSection><DashboardSection title="Recent Activity"><RetailSalesPanel sales={sales} /></DashboardSection></div>;
}

function TradersDashboard({ data, snapshot }) {
  const sales = data.sales || [];
  const recoveries = data.trader_recoveries || [];
  const retailers = data.trader_retailers || [];
  const routeSales = sales.filter((sale) => sale.route_uuid || sale.route_name).reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const recoveryTotal = recoveries.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const cards = [
    ['Retailers', retailers.length, false],
    ['Recoveries', recoveryTotal, true],
    ['Route Sales', routeSales, true],
    ['Outstanding Balances', retailers.reduce((sum, row) => sum + Number(row.balance || 0), 0), true],
  ];
  return <div className="stack"><DashboardSection title="Financial Overview"><MetricGrid cards={financialCards(data)} /></DashboardSection><DashboardSection title="Inventory Overview"><MetricGrid cards={inventoryOverviewCards(data, snapshot)} /></DashboardSection><DashboardSection title="Business Metrics"><MetricGrid cards={cards} /><section className="split"><DashboardTable title="Route Performance" rows={groupDashboardRows(sales, 'route_name')} cols={['name', 'total', 'count']} emptyIcon={FileText} emptyTitle="No Route Sales" emptyDescription="Route sales will appear after van sales are recorded." /><DashboardTable title="Recovery History" rows={recoveries.slice(0, 10)} cols={['retailer_name', 'salesman_name', 'amount', 'payment_method', 'date']} emptyIcon={WalletCards} emptyTitle="No Recovery Data" emptyDescription="Recoveries collected from retailers will appear here." /></section></DashboardSection><DashboardSection title="Recent Activity"><RetailSalesPanel sales={sales} /></DashboardSection></div>;
}

function nearExpiryProducts(products) {
  const limit = Date.now() + 90 * 86400000;
  return products.filter((product) => {
    if (!product.expiry_date) return false;
    const expiry = new Date(product.expiry_date).getTime();
    return Number.isFinite(expiry) && expiry <= limit;
  });
}

function SuperAdminDashboard({ data }) {
  const licenses = (data.licenses || []).map(enrichLicense);
  const activeLicenses = licenses.filter((license) => license.status === 'Active' && license.renewal_state !== 'Expired');
  const expiredLicenses = licenses.filter((license) => license.renewal_state === 'Expired');
  const expiringLicenses = licenses.filter((license) => license.renewal_state === 'Renew Soon');
  const totalRevenue = licenses.reduce((sum, license) => sum + Number(license.sale_price || 0), 0);
  const totalProfit = licenses.reduce((sum, license) => sum + Number(license.profit || 0), 0);
  const businessRows = Object.entries(licenses.reduce((acc, license) => {
    const key = license.business_type || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([business_type, total]) => ({ uuid: business_type, business_type, total }));
  const cards = [
    ['Total Licenses', licenses.length, false],
    ['Active Licenses', activeLicenses.length, false],
    ['Expiring Soon', expiringLicenses.length, false],
    ['Expired Licenses', expiredLicenses.length, false],
    ['License Revenue', totalRevenue, true],
    ['License Profit', totalProfit, true],
  ];
  return <div className="stack"><div className="metric-grid">{cards.map(([label, value, moneyValue]) => <div className="metric animated" key={label}><span>{label}</span><strong>{moneyValue ? money(value) : value}</strong></div>)}</div><section className="split"><DashboardTable title="License Users" rows={licenses.slice(0, 10)} cols={['owner_name', 'business_type', 'type', 'status', 'expiry_date', 'days_left', 'sale_price', 'profit']} emptyIcon={KeyRound} emptyTitle="No License Data Available" emptyDescription="Generated and activated licenses will appear here." /><DashboardTable title="Business Type Summary" rows={businessRows} cols={['business_type', 'total']} emptyIcon={BarChart3} emptyTitle="No Business Data Available" emptyDescription="License business categories will appear here automatically." /></section><DashboardTable title="Renewal Alerts" rows={expiringLicenses} cols={['owner_name', 'business_type', 'expiry_date', 'days_left', 'renewal_state']} emptyIcon={Bell} emptyTitle="No Renewals Due" emptyDescription="Licenses with 30 days or less remaining will appear here." /></div>;
}

function HospitalDashboard({ data, auth, brand, refresh }) {
  const [editingPatient, setEditingPatient] = useState(null);
  const doctor = currentDoctorName(auth, brand);
  const patients = patientRowsForUser(data.patients || [], auth, brand);
  const assistants = assistantRowsForUser(data.assistants || [], auth, brand);
  const today = new Date().toISOString().slice(0, 10);
  const todayPatients = patients.filter((patient) => String(patient.visit_date || patient.created_at || '').startsWith(today));
  const completedPatients = patients.filter((patient) => ['Treatment Completed', 'Closed'].includes(patient.status));
  const waitingPatients = patients.filter((patient) => ['Waiting', 'Doctor Checked', 'Sent To Reception'].includes(patient.status));
  const underTreatment = patients.filter((patient) => patient.status === 'Under Treatment');
  const currentQueue = patients.filter((patient) => ['Waiting', 'Doctor Checked', 'Sent To Reception', 'Under Treatment'].includes(patient.status));
  const frontDeskRows = hospitalFrontDeskRole(auth) ? todayPatients : currentQueue;
  const followUps = patients.filter((patient) => patient.next_visit && String(patient.next_visit).slice(0, 10) >= today);
  const feesToday = todayPatients.reduce((sum, patient) => sum + Number(patient.fee || 0), 0);
  const pendingBills = (data.hospital_bills || []).filter((bill) => Number(bill.balance || 0) > 0);
  const paidBillsToday = (data.hospital_bills || []).filter((bill) => bill.status === 'Paid' && String(bill.received_at || bill.updated_at || '').startsWith(today));
  const revenueToday = paidBillsToday.reduce((sum, bill) => sum + Number(bill.paid_amount || bill.paid || 0), 0);
  const admissions = patients.filter((patient) => patient.status === 'Admitted' || patient.visit_type === 'Admission');
  const appointments = patients.filter((patient) => String(patient.visit_type || '').toLowerCase().includes('appointment') || String(patient.visit_date || patient.created_at || '').startsWith(today));
  const pendingLab = (data.lab_reports || []).filter((row) => row.status === 'Pending');
  const pendingRadiology = (data.radiology_reports || []).filter((row) => row.status === 'Pending');
  const pendingReports = [...pendingLab, ...pendingRadiology];
  const completedReports = [...(data.lab_reports || []), ...(data.radiology_reports || [])].filter((row) => row.status === 'Completed');
  const reviewedReports = [...(data.lab_reports || []), ...(data.radiology_reports || [])].filter((row) => row.doctor_review_status === 'Reviewed' || row.status === 'Reviewed');
  const recentCompleted = completedPatients.slice(0, 8).map((patient) => {
    const bill = (data.hospital_bills || []).find((item) => item.patient_uuid === patient.uuid) || {};
    const medicinesText = (data.hospital_prescriptions || []).filter((item) => item.patient_uuid === patient.uuid).map((item) => item.medicine_name).join(', ');
    const testsText = [...(data.lab_reports || []), ...(data.radiology_reports || [])].filter((item) => item.patient_uuid === patient.uuid).map((item) => item.test_name || item.study_type).join(', ');
    return { ...patient, medicines: medicinesText, tests: testsText, final_amount: bill.grand_total, paid_amount: bill.paid_amount || bill.paid, completion_time: bill.completion_time || bill.received_at || patient.updated_at };
  });
  const medicines = patients
    .filter((patient) => patient.medicine)
    .slice(0, 8)
    .map((patient) => ({ uuid: patient.uuid, patient_name: patient.patient_name, medicine: patient.medicine, medicine_days: patient.medicine_days, next_visit: patient.next_visit, diagnosis: patient.diagnosis, visit_date: patient.visit_date }));
  const cards = [
    ['Patients', patients.length, false],
    ['Admissions', admissions.length, false],
    ['Appointments', appointments.length, false],
    ['Revenue', revenueToday || feesToday, true],
  ];
  const newPatient = () => RESOURCES.patients.defaultRecord({ auth, brand });
  const canCreatePatient = !['Receptionist', 'Billing Officer'].includes(auth?.role || '');
  async function submitPatient(record) {
    const saved = await saveHospitalPatientWorkflow(record);
    try {
      await syncHospitalPatientWorkflow(saved.uuid);
    } catch (error) {
      notify(error.message || 'Hospital workflow sync failed');
    }
    setEditingPatient(null);
    await refresh();
    notify(`${saved.token_number || 'Token'} sent to reception. Token Slip button se print karein.`);
  }
  return <div className="stack"><DashboardSection title="Financial Overview"><MetricGrid cards={financialCards(data)} /></DashboardSection><DashboardSection title="Inventory Overview"><MetricGrid cards={inventoryOverviewCards(data)} /></DashboardSection><section className="panel"><div className="module-head"><div><h2>{hospitalFrontDeskRole(auth) ? 'Reception Desk' : 'Patient Desk'}</h2><p className="muted">Daily token queue, doctor recommendations, services and billing workflow.</p></div>{canCreatePatient && <div className="module-actions"><button className="primary-btn" onClick={() => setEditingPatient(newPatient())}><Plus size={16} /> Add Patient</button></div>}</div><DataTable rows={frontDeskRows.slice(0, 8)} columns={['token_number', 'mr_number', 'patient_name', 'phone', 'department', 'doctor_name', 'status']} onAdd={canCreatePatient ? () => setEditingPatient(newPatient()) : null} actions={(row) => <><button className="ghost-btn" onClick={() => printPatientTokenSlip(row, brand)}><Printer size={15} /> Token Slip</button><button className="ghost-btn" onClick={() => setEditingPatient(row)}><Edit3 size={15} /> Open File</button></>} /></section><DashboardSection title="Business Metrics"><MetricGrid cards={cards} /></DashboardSection><DashboardSection title="Recent Activity"><DashboardTable title="Recent Completed Patients" rows={recentCompleted} cols={['token_number', 'patient_name', 'diagnosis', 'medicines', 'tests', 'final_amount', 'paid_amount', 'completion_time']} emptyIcon={Users} emptyTitle="No Completed Patients" emptyDescription="Closed and paid patient cases will appear here." /><section className="split"><DashboardTable title={hospitalFrontDeskRole(auth) ? 'Today Reception Queue' : 'Doctor Treatment Status'} rows={frontDeskRows} cols={['token_number', 'mr_number', 'patient_name', 'visit_type', 'department', 'doctor_name', 'status']} emptyIcon={Users} emptyTitle="No Queue Available" emptyDescription="Doctor or assistant added patients will appear here." /><DashboardTable title="Follow Up Patients" rows={followUps} cols={['patient_name', 'phone', 'diagnosis', 'next_visit', 'status']} emptyIcon={Bell} emptyTitle="No Follow Ups" emptyDescription="Upcoming follow-up patients will appear here." /></section><section className="split"><DashboardTable title="Doctor Prescriptions" rows={data.hospital_prescriptions || []} cols={['token_number', 'patient_name', 'doctor_name', 'medicine_name', 'morning', 'afternoon', 'evening', 'night', 'days', 'status']} emptyIcon={Boxes} emptyTitle="No Pharmacy Tasks" emptyDescription="Doctor prescriptions will appear here." /><DashboardTable title="Doctor Recommended Tests / Services" rows={[...(data.hospital_tasks || []), ...pendingLab, ...pendingRadiology]} cols={['token_number', 'patient_name', 'task_name', 'test_name', 'study_type', 'status']} emptyIcon={FileText} emptyTitle="No Recommended Services" emptyDescription="Injection, X-Ray, lab and other recommendations will appear here." /></section><section className="split"><DashboardTable title="Medicine / Prescription History" rows={medicines} cols={['patient_name', 'medicine', 'medicine_days', 'next_visit', 'diagnosis', 'visit_date']} emptyIcon={FileText} emptyTitle="No Medicine History" emptyDescription="Medicine prescribed to patients will appear here." /><DashboardTable title="Pending Bills" rows={pendingBills} cols={['token_number', 'bill_number', 'patient_name', 'grand_total', 'paid', 'balance', 'status']} emptyIcon={Calculator} emptyTitle="No Pending Bills" emptyDescription="Auto-generated hospital bills will appear here." /></section></DashboardSection>{editingPatient && <RecordModal title="Patient Management" fields={RESOURCES.patients.fields} record={editingPatient} context={{ auth, brand, assistants, catalogs: data.master_catalogs || [], medicines: data.medicines || [] }} onClose={() => setEditingPatient(null)} onSubmit={submitPatient} />}</div>;
}

function currentDoctorName(auth, brand) {
  const name = auth?.user || '';
  if (name && !['Admin', 'Manager', 'Cashier', 'Receptionist', 'Billing Officer', 'Hospital Owner'].includes(auth?.role || name)) return name;
  return brand?.owner_name || brand?.shop_name || name;
}

function hospitalFrontDeskRole(auth) {
  return ['Receptionist', 'Billing Officer', 'Admin', 'Hospital Owner', 'Super Admin'].includes(auth?.role || '');
}

function patientRowsForUser(rows, auth, brand) {
  if (brand?.business_type !== 'Hospital') return rows;
  if (hospitalFrontDeskRole(auth)) return rows;
  const doctor = currentDoctorName(auth, brand).toLowerCase();
  if (!doctor || auth?.role === 'Super Admin') return rows;
  const scoped = rows.filter((patient) => String(patient.doctor_name || '').toLowerCase() === doctor);
  return scoped.length ? scoped : rows;
}

function assistantRowsForUser(rows, auth, brand) {
  if (brand?.business_type !== 'Hospital') return rows;
  if (hospitalFrontDeskRole(auth)) return rows;
  const doctor = currentDoctorName(auth, brand).toLowerCase();
  if (!doctor || auth?.role === 'Super Admin') return rows;
  const scoped = rows.filter((assistant) => String(assistant.doctor_name || '').toLowerCase() === doctor);
  return scoped.length ? scoped : rows;
}

function SalesChart({ sales, max }) {
  const chartRows = sales.slice(0, 8).reverse();
  return <div className="chart-card"><div className="chart-grid-lines"><span /><span /><span /></div><div className="chart">{chartRows.map((sale, index) => { const height = Math.max(12, (Number(sale.total || 0) / max) * 100); return <div className="chart-column" key={sale.uuid} style={{ '--bar-height': `${height}%`, '--bar-delay': `${index * 45}ms` }} title={`${sale.invoice_number} - ${money(sale.total)}`}><strong>{money(sale.total)}</strong><span className="chart-bar" /><small>{sale.invoice_number || `Sale ${index + 1}`}</small></div>; })}</div></div>;
}

function DashboardTable({ title, rows, cols, emptyIcon, emptyTitle, emptyDescription }) {
  return <section className="panel"><h2>{title}</h2>{rows.length ? <DataTable rows={rows} columns={cols} /> : <DashboardEmpty icon={emptyIcon} title={emptyTitle} description={emptyDescription} />}</section>;
}

function DashboardEmpty({ icon: Icon, title, description }) {
  return <div className="dashboard-empty"><Icon size={30} /><strong>{title}</strong><p>{description}</p></div>;
}

function WalletDashboard({ wallets }) {
  const rows = ['JazzCash', 'EasyPaisa'].map((provider) => {
    const items = wallets.filter((row) => row.provider === provider && row.status !== 'Failed');
    const cashIn = items.filter((row) => row.type === 'Cash In').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const cashOut = items.filter((row) => row.type === 'Cash Out').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const pending = items.filter((row) => row.status === 'Pending').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const fee_profit = items.filter((row) => row.status === 'Completed').reduce((sum, row) => sum + Number(row.fee || 0), 0);
    return { uuid: provider, provider, available: cashIn - cashOut, cash_in: cashIn, sent: cashOut, pending, fee_profit };
  });
  const totals = rows.reduce((acc, row) => ({
    available: acc.available + row.available,
    sent: acc.sent + row.sent,
    pending: acc.pending + row.pending,
    fee_profit: acc.fee_profit + row.fee_profit,
  }), { available: 0, sent: 0, pending: 0, fee_profit: 0 });
  return <section className="panel"><div className="module-head"><h2>EasyPaisa / JazzCash Wallets</h2><span className="shortcut-pill"><WalletCards size={15} /> Available {money(totals.available)}</span></div><div className="metric-grid"><div className="metric"><span>Total Available</span><strong>{money(totals.available)}</strong></div><div className="metric"><span>Total Sent</span><strong>{money(totals.sent)}</strong></div><div className="metric"><span>Pending Balance</span><strong>{money(totals.pending)}</strong></div><div className="metric"><span>Fee Profit</span><strong>{money(totals.fee_profit)}</strong></div></div><DataTable rows={rows} columns={['provider', 'available', 'cash_in', 'sent', 'pending', 'fee_profit']} /></section>;
}

function CrudModule({ config, rows, refresh, extraActions, context = {} }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const importRef = useRef(null);
  const blankRecord = () => config.defaultRecord?.(context) || DEFAULT_RECORDS[config.title]?.() || {};
  const displayRows = useMemo(() => config.rowMap ? config.rowMap(rows) : rows, [rows, config]);
  const filtered = useMemo(() => filterRows(displayRows, query, config.search), [displayRows, query, config.search]);
  async function submit(record) {
    const saved = config.customSave ? await config.customSave(record) : await saveRecord(config.store, record);
    if (config.store === 'patients') await syncHospitalPatientWorkflow(saved.uuid);
    else runInBackground(() => saveRemoteRecord(config.store, saved), `${config.title} synced in background`);
    setEditing(null);
    await refresh();
    notify('Record saved successfully');
  }
  async function remove(row, mode) {
    await deleteEverywhere(config.store, row, mode);
    setDeleting(null);
    await refresh();
    notify('Record deleted successfully');
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await importCsvRecords(config.store, file);
    event.target.value = '';
    await refresh();
    notify('Import completed successfully');
  }
  return <div className="stack"><section className="panel"><ModuleHeader title={config.title} query={query} setQuery={setQuery} onAdd={() => setEditing(blankRecord())} onImport={() => importRef.current?.click()} onExport={() => exportCsv(`${config.store}.csv`, filtered)} onPrint={() => printTable(config.title, filtered, config.columns)} /><input ref={importRef} className="hidden-input" type="file" accept=".csv" onChange={importFile} /><DataTable rows={filtered} columns={config.columns} onAdd={() => setEditing(blankRecord())} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button>{extraActions?.(row)}</>} /></section>{viewing && <DetailModal title={`${config.title} Detail`} row={viewing} columns={config.columns} onClose={() => setViewing(null)} />}{editing && <RecordModal title={config.title} fields={config.fields} record={editing} context={context} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store={config.store} onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function CatalogModule({ rows, products, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const importRef = useRef(null);
  const config = RESOURCES.master_catalogs;
  const scoped = useMemo(() => catalogRowsForBusiness(rows, brand), [rows, brand]);
  const filtered = useMemo(() => filterRows(scoped, query, config.search), [scoped, query]);
  const importedCount = rows.length;
  const presetCount = (CATALOG_PRESETS[brand?.business_type || 'General Store'] || CATALOG_PRESETS['General Store']).length;
  const blank = () => config.defaultRecord({ brand });

  async function submit(record) {
    const productName = record.product_name || record.name;
    const saved = await saveRecord('master_catalogs', { ...record, name: productName, product_name: productName, business_type: brand?.business_type || 'General Store' });
    runInBackground(() => saveRemoteRecord('master_catalogs', saved), 'Catalog synced in background');
    setEditing(null);
    await refresh();
    notify('Catalog item saved successfully');
  }

  async function remove(row, mode) {
    await deleteEverywhere('master_catalogs', row, mode);
    setDeleting(null);
    await refresh();
    notify('Catalog item deleted successfully');
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const count = await importMasterCatalogCsv(file);
    event.target.value = '';
    await refresh();
    notify(`${count} catalog names imported successfully`);
  }

  async function seedPresets() {
    const businessType = brand?.business_type || 'General Store';
    const existing = new Set(rows.map((row) => `${String(row.business_type || '').toLowerCase()}|${String(row.product_name || row.name || '').toLowerCase()}`));
    const source = CATALOG_PRESETS[businessType] || CATALOG_PRESETS['General Store'];
    let count = 0;
    for (const item of source) {
      const record = catalogPresetRecord(item, businessType);
      const key = `${businessType.toLowerCase()}|${record.product_name.toLowerCase()}`;
      if (existing.has(key)) continue;
      await saveRecord('master_catalogs', record);
      count += 1;
    }
    await refresh();
    notify(count ? `${count} starter catalog items added` : 'Starter catalog already exists');
  }

  async function addToInventory(row) {
    const productName = row.product_name || row.name;
    const candidate = calculatedProduct({
      product_name: productName,
      category: row.category || categoriesForBusiness(brand)[0],
      brand: row.brand || '',
      barcode: row.barcode || '',
      pack_size: row.pack_size || '',
      variant_type: row.unit || 'Single Unit',
      unit: row.unit || 'Single Unit',
      package_quantity: 0,
      units_per_package: 1,
      loose_quantity: 0,
      quantity: 0,
      purchase_price: Number(row.default_cost || 0),
      sale_price: Number(row.default_price || 0),
      low_stock_threshold: 3,
    });
    const exists = products.some((product) => productVariantIdentity(product) === productVariantIdentity(candidate));
    if (exists) return notify('This item already exists in inventory');
    const product = await saveRecord('products', candidate);
    window.dispatchEvent(new CustomEvent('msm:product-saved', { detail: product }));
    broadcastInventoryRefresh({ action: 'product-created-from-catalog', product_uuid: product.uuid });
    runInBackground(() => saveRemoteRecord('products', product), 'Inventory synced in background');
    await refresh();
    await auditProductHydration(product);
    notify('Catalog item added to inventory');
  }

  return <div className="stack"><section className="panel"><ModuleHeader title="Master Catalog" query={query} setQuery={setQuery} onAdd={() => setEditing(blank())} onImport={() => importRef.current?.click()} onExport={() => exportCsv('master-catalog.csv', filtered)} onPrint={() => printTable('Master Catalog', filtered, config.columns)} /><input ref={importRef} className="hidden-input" type="file" accept=".csv" onChange={importFile} /><div className="module-actions report-actions"><button className="ghost-btn" onClick={seedPresets}><Plus size={16} /> Add Starter Catalog</button><button className="ghost-btn" onClick={downloadCatalogTemplate}><Download size={16} /> CSV Template</button><span className="shortcut-pill">{brand?.business_type || 'General Store'} catalog: {filtered.length} shown / {importedCount} total / {presetCount} starter</span></div><DataTable rows={filtered} columns={config.columns} onAdd={() => setEditing(blank())} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => addToInventory(row)}><Boxes size={15} /> Inventory</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title="Catalog Detail" row={viewing} columns={config.columns} onClose={() => setViewing(null)} />}{editing && <RecordModal title="Master Catalog" fields={config.fields} record={editing} context={{ brand }} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store="master_catalogs" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function MedicinesModule({ rows, refresh }) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ category: '', manufacturer: '', dosage_form: '', status: '' });
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [results, setResults] = useState(rows);
  const [importResult, setImportResult] = useState(null);
  const importRef = useRef(null);
  const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))].sort();
  const manufacturers = [...new Set(rows.map((row) => row.manufacturer).filter(Boolean))].sort();

  useEffect(() => { setResults(rows); }, [rows]);
  useEffect(() => {
    const handle = setTimeout(async () => {
      const found = await searchMedicines(query, filters);
      setResults(found.length || query ? found : rows);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, filters, rows]);

  async function submit(record) {
    const normalized = medicineFormPayload(record);
    const saved = await saveRecord('medicines', normalized);
    runInBackground(() => saveRemoteRecord('medicines', saved), 'Medicine synced in background');
    setEditing(null);
    await refresh();
    notify('Medicine saved successfully');
  }

  async function remove(row, mode) {
    await deleteEverywhere('medicines', row, mode);
    setDeleting(null);
    await refresh();
    notify('Medicine deleted successfully');
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = await importMedicinesFile(file);
      setImportResult(payload);
      await searchMedicines('', { per_page: 200 });
      await refresh();
      notify(`Medicines import complete: ${payload.created || 0} created, ${payload.updated || 0} updated`);
    } catch (error) {
      notify(error.message || 'Medicine import failed');
    } finally {
      event.target.value = '';
    }
  }

  const filtered = useMemo(() => filterRows(results, '', MEDICINE_COLUMNS), [results]);
  const categoryRows = categories.map((category) => ({ uuid: category, category, total: rows.filter((row) => row.category === category).length }));
  const manufacturerRows = manufacturers.map((manufacturer) => ({ uuid: manufacturer, manufacturer, total: rows.filter((row) => row.manufacturer === manufacturer).length }));
  return <div className="stack"><section className="panel"><ModuleHeader title="Pakistan Medicine Master Database" query={query} setQuery={setQuery} onAdd={() => setEditing({ status: 'Active', category: 'Medicine', batch_tracking: 'Yes', expiry_tracking: 'Yes' })} onImport={() => importRef.current?.click()} onExport={() => exportCsv('pakistan-medicines.csv', filtered)} onPrint={() => printTable('Pakistan Medicine Master Database', filtered.slice(0, 500), MEDICINE_COLUMNS)} /><input ref={importRef} className="hidden-input" type="file" accept=".csv,.xlsx,.xls" onChange={importFile} /><div className="module-actions report-actions"><select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="">All Categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={filters.manufacturer} onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}><option value="">All Manufacturers</option>{manufacturers.map((item) => <option key={item}>{item}</option>)}</select><select value={filters.dosage_form} onChange={(e) => setFilters({ ...filters, dosage_form: e.target.value })}><option value="">All Forms</option>{['Tablet', 'Capsule', 'Syrup', 'Injection', 'Suspension', 'Drops', 'Cream', 'Ointment', 'Sachet', 'Inhaler', 'Device'].map((item) => <option key={item}>{item}</option>)}</select><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All Status</option><option>Active</option><option>Inactive</option><option>Discontinued</option></select><button className="ghost-btn" onClick={() => downloadPdf('medicine-list.pdf', 'Complete Medicine List', filtered.slice(0, 500).flatMap((row) => [`${row.brand_name} - ${row.generic_name || ''} ${row.strength || ''}`, `${row.manufacturer || ''} | ${money(row.sale_price)} | ${row.status || 'Active'}`]))}><FileDown size={16} /> Export PDF</button></div>{importResult && <div className="dashboard-empty"><Upload size={28} /><strong>Import Result</strong><p>{importResult.created || 0} created, {importResult.updated || 0} updated, {importResult.duplicates || 0} duplicates, {(importResult.errors || []).length} errors.</p></div>}<DataTable rows={filtered} columns={MEDICINE_COLUMNS} onAdd={() => setEditing({ status: 'Active', category: 'Medicine', batch_tracking: 'Yes', expiry_tracking: 'Yes' })} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => addMedicineToInventory(row)}><Boxes size={15} /> Inventory</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section><section className="split"><DashboardTable title="Medicine Categories" rows={categoryRows} cols={['category', 'total']} emptyIcon={Boxes} emptyTitle="No Categories Available" emptyDescription="Categories will appear after medicine import." /><DashboardTable title="Manufacturers" rows={manufacturerRows} cols={['manufacturer', 'total']} emptyIcon={Users} emptyTitle="No Manufacturers Available" emptyDescription="Manufacturers will appear after medicine import." /></section>{viewing && <DetailModal title="Medicine Detail" row={viewing} columns={[...MEDICINE_COLUMNS, 'composition', 'therapeutic_class', 'distributor', 'registration_no', 'tax_percentage', 'batch_tracking', 'expiry_tracking']} onClose={() => setViewing(null)} />}{editing && <RecordModal title="Medicine Master Database" fields={MEDICINE_FIELDS} record={editing} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store="medicines" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function BackupModule({ data, auth, brand, refresh }) {
  const restoreRef = useRef(null);
  const businessType = brand?.business_type || 'General Store';
  const isHospital = businessType === 'Hospital';
  const patients = data?.patients || [];
  const products = data?.products || [];
  const customers = data?.customers || [];
  const sales = data?.sales || [];
  async function restore(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const count = await importBackupFile(file);
      event.target.value = '';
      await refresh();
      notify(`${count} backup records restored successfully`);
    } catch (error) {
      notify(error.message || 'Backup restore failed');
    }
  }
  const patientColumns = ['patient_name', 'phone', 'age', 'gender', 'doctor_name', 'assistant_name', 'symptoms', 'diagnosis', 'medicine', 'medicine_days', 'next_visit', 'fee', 'status', 'visit_date', 'notes'];
  const patientRows = patients.map((patient) => Object.fromEntries(patientColumns.map((column) => [column, patient[column] ?? ''])));
  const backupStores = backupStoresForBusiness(auth?.role, businessType);
  const countCards = isHospital
    ? [['Patients', patients.length], ['Assistants', (data?.assistants || []).length], ['Expenses', (data?.expenses || []).length], ['Reports', patients.length]]
    : [['Inventory', products.length], ['Customers', customers.length], ['Sales', sales.length], ['Suppliers', (data?.suppliers || []).length]];
  const backupDescription = auth?.role === 'Super Admin'
    ? 'Full platform backup includes licenses, settings and admin records.'
    : `${businessType} backup includes only this registered business data. Other portal data, licenses and Super Admin control data are excluded.`;
  return <div className="stack"><section className="panel"><div className="module-head"><h2>{businessType} Backup & Restore</h2><div className="module-actions"><button className="primary-btn" onClick={() => exportBackupFile(`${businessType.toLowerCase().replaceAll(' ', '-')}-backup-${new Date().toISOString().slice(0, 10)}.json`, backupStores)}><Download size={16} /> {businessType} Backup</button><button className="ghost-btn" onClick={() => restoreRef.current?.click()}><Upload size={16} /> Restore Backup</button></div></div><input ref={restoreRef} className="hidden-input" type="file" accept=".json" onChange={restore} /><div className="metric-grid">{countCards.map(([label, value]) => <div className="metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="dashboard-empty"><Download size={34} /><strong>{auth?.role === 'Super Admin' ? 'Complete platform backup' : `${businessType} business backup`}</strong><p>{backupDescription}</p></div></section>{isHospital && <section className="panel"><div className="module-head"><h2>Patients Backup</h2><div className="module-actions"><button className="ghost-btn" onClick={() => exportCsv(`patients-backup-${new Date().toISOString().slice(0, 10)}.csv`, patientRows)}><Download size={16} /> Export Patients CSV</button><button className="ghost-btn" onClick={() => printTable('Patients Backup', patients, patientColumns)}><Printer size={16} /> Print Patients</button></div></div><DataTable rows={patients.slice(0, 10)} columns={patientColumns.slice(0, 10)} /></section>}</div>;
}

function Inventory({ rows, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [receiving, setReceiving] = useState({ scan: '', quantity: 1, cost_price: '', batch_number: '', expiry_date: '' });
  const [receivingMatch, setReceivingMatch] = useState(null);
  const importRef = useRef(null);
  const rules = businessTypeRules(brand);
  const columns = rules.inventoryColumns;
  const categoryOptions = categoriesForBusiness(brand);
  const filtered = useMemo(() => filterRows(inventoryRows(rows), query, rules.inventorySearch), [rows, query, rules]);
  const blank = {
    category: categoryOptions[0],
    unit: 'Single Unit',
    variant_type: 'Single Unit',
    package_quantity: 0,
    units_per_package: 1,
    loose_quantity: 0,
    quantity: 0,
    low_stock_threshold: 3,
    purchase_price: 0,
    sale_price: 0,
    package_cost_price: 0,
    total_cost: 0,
  };

  async function submit(event) {
    event.preventDefault();
    const draft = calculatedProduct(editing, true);
    const conflicts = duplicateProductConflicts(rows, draft);
    if (conflicts.length) {
      setDuplicateWarning({ draft, conflicts, product: conflicts[0].product });
      return;
    }
    await saveProductDraft(draft);
  }

  async function saveProductDraft(draft, auditAction = draft?.uuid ? 'Product Edited' : 'Product Created') {
    const product = await saveRecord('products', calculatedProduct(draft, true));
    window.dispatchEvent(new CustomEvent('msm:product-saved', { detail: product }));
    broadcastInventoryRefresh({ action: auditAction, product_uuid: product.uuid });
    runInBackground(() => saveRemoteRecord('products', product), 'Inventory synced in background');
    setEditing(null);
    setDuplicateWarning(null);
    await refresh();
    await auditProductHydration(product);
    await auditInventoryAction(auditAction, product);
    notify('Product saved successfully');
  }

  async function keepExistingDuplicate() {
    const sanitized = clearDuplicateIdentityFields(duplicateWarning.draft, duplicateWarning.conflicts);
    await auditInventoryAction('Duplicate Warning', sanitized, {
      duplicate_fields: duplicateWarning.conflicts.map((conflict) => conflict.key),
      resolution: 'keep_existing_identifiers',
    });
    await saveProductDraft(sanitized, sanitized.uuid ? 'Product Edited' : 'Product Created');
  }

  async function mergeDuplicateDraft() {
    const target = duplicateWarning.product;
    const draft = duplicateWarning.draft;
    const merged = calculatedProduct({
      ...target,
      ...nonEmptyProductFields(draft, target),
      uuid: target.uuid,
      quantity: Number(target.quantity || 0) + (draft.uuid ? 0 : Number(draft.quantity || 0)),
      product_name: target.product_name || draft.product_name,
      brand: target.brand || draft.brand,
      pack_size: target.pack_size || draft.pack_size,
      unit: target.unit || draft.unit,
    });
    await auditInventoryAction('Product Merged', merged, {
      source_uuid: draft.uuid || 'new_product_draft',
      target_uuid: target.uuid,
      duplicate_fields: duplicateWarning.conflicts.map((conflict) => conflict.key),
    });
    setEditing(merged);
    setDuplicateWarning(null);
    notify('Merged into existing product draft. Review and save to confirm.');
  }

  async function remove(row, mode) {
    await deleteEverywhere('products', row, mode);
    broadcastInventoryRefresh({ action: 'product-deleted', product_uuid: row.uuid, mode });
    setDeleting(null);
    await refresh();
    notify('Product deleted successfully');
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await importCsvRecords('products', file);
    event.target.value = '';
    broadcastInventoryRefresh({ action: 'inventory-import' });
    await refresh();
    notify('Inventory import completed successfully');
  }

  function change(key, value) {
    setEditing((current) => calculatedProduct({ ...current, [key]: value }));
  }

  async function receiveScan(event) {
    event.preventDefault();
    try {
      await receiveInventoryByScan({ ...receiving, product_uuid: receivingMatch?.product?.uuid }, { products: rows });
      setReceiving({ scan: '', quantity: 1, cost_price: '', batch_number: '', expiry_date: '' });
      setReceivingMatch(null);
      broadcastInventoryRefresh({ action: 'stock-received', product_uuid: receivingMatch?.product?.uuid });
      await refresh();
      notify('Scanned stock received successfully');
    } catch (error) {
      notify(error.message || 'Barcode receiving failed');
    }
  }

  const edit = calculatedProduct(editing || blank);
  return <div className="stack"><section className="panel"><ModuleHeader title="Inventory Management" query={query} setQuery={setQuery} onAdd={() => setEditing(blank)} onImport={() => importRef.current?.click()} onExport={() => exportCsv('products.csv', filtered)} onPrint={() => printTable('Inventory Management', filtered, columns)} /><form className="inline-form" onSubmit={receiveScan}><UniversalProductLookup autoFocus value={receiving.scan} data={{ products: rows }} onChange={(value) => { setReceiving({ ...receiving, scan: value }); setReceivingMatch(null); }} onPick={(match) => { setReceivingMatch(match); setReceiving({ ...receiving, scan: match.product?.barcode || match.product?.sku || productDisplayName(match.product) || receiving.scan, cost_price: receiving.cost_price || match.product?.purchase_price || '' }); }} /><input type="number" min="1" value={receiving.quantity} onChange={(event) => setReceiving({ ...receiving, quantity: event.target.value })} /><input type="number" min="0" step="0.01" placeholder="Cost" value={receiving.cost_price} onChange={(event) => setReceiving({ ...receiving, cost_price: event.target.value })} />{rules.showBatch && <input placeholder="Batch" value={receiving.batch_number} onChange={(event) => setReceiving({ ...receiving, batch_number: event.target.value })} />}{rules.showExpiry && <input type="date" value={receiving.expiry_date} onChange={(event) => setReceiving({ ...receiving, expiry_date: event.target.value })} />}<button className="ghost-btn" disabled={!receiving.scan}><Plus size={15} /> Receive Scan</button></form>{receivingMatch?.product && <div className="lookup-selected"><strong>{productDisplayName(receivingMatch.product)}</strong><span>{receivingMatch.product.brand || 'No brand'} - {receivingMatch.product.category || 'No category'} - {receivingMatch.product.unit || 'Unit'} - Stock {receivingMatch.product.quantity || 0} - {money(receivingMatch.product.sale_price || 0)}</span></div>}<input ref={importRef} className="hidden-input" type="file" accept=".csv" onChange={importFile} /><DataTable rows={filtered} columns={columns} onAdd={() => setEditing(blank)} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => setEditing(calculatedProduct(row))}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => printBarcode(row)}><Printer size={15} /> Barcode</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title="Product Detail" row={viewing} columns={[...new Set([...columns, ...rules.detailFields])]} onClose={() => setViewing(null)} />}{editing && <ModalShell onClose={() => setEditing(null)}><form onSubmit={submit}><div className="modal-header"><h2>{editing.uuid ? 'Edit Product' : 'Add Product'}</h2><button type="button" className="icon-btn" onClick={() => setEditing(null)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Product Name<input required value={edit.product_name || ''} onChange={(event) => change('product_name', event.target.value)} /></label><label>Category<select value={edit.category || categoryOptions[0]} onChange={(event) => change('category', event.target.value)}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label>Brand<input value={edit.brand || ''} onChange={(event) => change('brand', event.target.value)} /></label>{rules.showMedicine && <label>Generic Name<input value={edit.generic_name || ''} onChange={(event) => change('generic_name', event.target.value)} /></label>}<label>SKU<input value={edit.sku || ''} onChange={(event) => change('sku', event.target.value)} /></label><label>Product Code<input value={edit.product_code || ''} onChange={(event) => change('product_code', event.target.value)} /></label><label>Barcode<input value={edit.barcode || ''} onChange={(event) => change('barcode', event.target.value)} /></label><label>Secondary Barcode<input value={edit.secondary_barcode || ''} onChange={(event) => change('secondary_barcode', event.target.value)} /></label><label>QR Code<input value={edit.qr_code || ''} onChange={(event) => change('qr_code', event.target.value)} /></label>{rules.showPackaging && <label>Box Barcode<input value={edit.box_barcode || ''} onChange={(event) => change('box_barcode', event.target.value)} /></label>}{rules.showPackaging && <label>Carton Barcode<input value={edit.carton_barcode || ''} onChange={(event) => change('carton_barcode', event.target.value)} /></label>}<label>Unit<select value={edit.unit || 'Single Unit'} onChange={(event) => change('unit', event.target.value)}>{RETAIL_UNITS.map((item) => <option key={item}>{item}</option>)}</select></label>{rules.showPackaging && <label>Variant Type<select value={edit.variant_type || edit.unit || 'Single Unit'} onChange={(event) => change('variant_type', event.target.value)}>{RETAIL_UNITS.map((item) => <option key={item}>{item}</option>)}</select></label>}{rules.showPackaging && <label>Pack Size<input value={edit.pack_size || ''} onChange={(event) => change('pack_size', event.target.value)} /></label>}{rules.showPackaging && <label>Boxes / Packs Qty<input type="number" min="0" value={edit.package_quantity ?? 0} onChange={(event) => change('package_quantity', event.target.value)} /></label>}{rules.showPackaging && <label>Pcs Per Box / Pack<input type="number" min="1" value={edit.units_per_package ?? ''} onChange={(event) => change('units_per_package', event.target.value)} onBlur={(event) => { if (event.target.value === '') change('units_per_package', 1); }} /></label>}{rules.showPackaging && <label>Loose Pcs<input type="number" min="0" value={edit.loose_quantity ?? 0} onChange={(event) => change('loose_quantity', event.target.value)} /></label>}<label>Total Stock<input type="number" readOnly value={edit.quantity || 0} /></label><label>Cost Price<input type="number" min="0" step="0.01" value={edit.purchase_price || 0} onChange={(event) => change('purchase_price', event.target.value)} /></label>{rules.showPackaging && <label>Cost Per Box / Pack<input type="number" readOnly value={edit.package_cost_price || 0} /></label>}{rules.showPackaging && <label>Total Cost<input type="number" readOnly value={edit.total_cost || 0} /></label>}<label>Sale Price<input type="number" min="0" step="0.01" value={edit.sale_price || 0} onChange={(event) => change('sale_price', event.target.value)} /></label><label>Low Stock Warning<input type="number" min="0" value={edit.low_stock_threshold || 3} onChange={(event) => change('low_stock_threshold', event.target.value)} /></label>{rules.showMedicine && <label>Strength<input value={edit.strength || ''} onChange={(event) => change('strength', event.target.value)} /></label>}{rules.showMedicine && <label>Dosage Form<input value={edit.dosage_form || ''} onChange={(event) => change('dosage_form', event.target.value)} /></label>}{rules.showBatch && <label>Batch Number<input value={edit.batch_number || ''} onChange={(event) => change('batch_number', event.target.value)} /></label>}{rules.showExpiry && <label>Expiry Date<input type="date" value={edit.expiry_date || ''} onChange={(event) => change('expiry_date', event.target.value)} /></label>}{rules.showImei && <label>Model<input value={edit.model || ''} onChange={(event) => change('model', event.target.value)} /></label>}{rules.showImei && <label>Serial Number<input value={edit.serial_number || ''} onChange={(event) => change('serial_number', event.target.value)} /></label>}{rules.showImei && <label>IMEI Numbers<textarea rows="3" value={imeiListText(edit)} onChange={(event) => { change('imei_numbers', event.target.value); change('imei', event.target.value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean)[0] || ''); }} /></label>}{rules.showMedicine && <label>Manufacturer<input value={edit.manufacturer || ''} onChange={(event) => change('manufacturer', event.target.value)} /></label>}{rules.showWarranty && <label>Warranty<input value={edit.warranty || ''} onChange={(event) => change('warranty', event.target.value)} /></label>}<label>Supplier<input value={edit.supplier_name || ''} onChange={(event) => change('supplier_name', event.target.value)} /></label></div>{rules.showPackaging && <PackagingBuilder product={edit} onChange={change} />}<div className="totals inventory-total"><span>Total Stock: <strong>{edit.quantity || 0}</strong></span>{rules.showPackaging && <span>Per Box Cost: <strong>{money(edit.package_cost_price)}</strong></span>}<span>Total Cost: <strong>{money(edit.total_cost)}</strong></span></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setEditing(null)}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>}{duplicateWarning && <DuplicateProductDialog warning={duplicateWarning} onClose={() => setDuplicateWarning(null)} onKeepExisting={keepExistingDuplicate} onMerge={mergeDuplicateDraft} />}{deleting && <DeleteDialog row={deleting} store="products" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function calculatedProduct(record, finalize = false) {
  if (!record) return record;
  const packageQuantity = safeNumber(record.package_quantity, 0);
  const rawUnitsPerPackage = record.units_per_package;
  const unitsPerPackage = rawUnitsPerPackage === '' && !finalize ? '' : Math.max(1, safeNumber(rawUnitsPerPackage, 1));
  const unitsPerPackageForMath = unitsPerPackage === '' ? 1 : unitsPerPackage;
  const looseQuantity = safeNumber(record.loose_quantity, 0);
  const purchasePrice = Number(record.purchase_price || record.unit_cost_price || 0);
  const salePrice = Number(record.sale_price || record.unit_sale_price || 0);
  const quantity = packageQuantity * unitsPerPackageForMath + looseQuantity;
  return {
    ...record,
    unit_cost_price: purchasePrice,
    unit_sale_price: salePrice,
    package_quantity: packageQuantity,
    units_per_package: unitsPerPackage,
    loose_quantity: looseQuantity,
    quantity,
    purchase_price: purchasePrice,
    sale_price: salePrice,
    package_cost_price: purchasePrice * unitsPerPackageForMath,
    total_cost: purchasePrice * quantity,
  };
}

function safeNumber(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function productVariantIdentity(record = {}) {
  const direct = [
    record.barcode,
    record.secondary_barcode,
    record.qr_code,
    record.box_barcode,
    record.carton_barcode,
    record.sku,
    record.product_code,
    record.imei,
  ].find((value) => String(value || '').trim());
  if (direct) return String(direct).trim().toLowerCase();
  return [
    record.product_name || record.name,
    record.brand,
    record.category,
    record.model,
    record.pack_size,
    record.unit,
    record.variant_type,
    record.units_per_package,
    record.sale_price,
  ].map((value) => String(value || '').trim().toLowerCase()).join('|');
}

function PackagingBuilder({ product, onChange }) {
  const baseLabel = product?.unit && !['Single Unit', 'Unit'].includes(product.unit) ? product.unit : product?.variant_type || 'Piece';
  const rows = parsePackagingUnits(product?.packaging_units).map((row, index) => ({
    key: row.key || String(row.unit || row.unit_name || row.label || `level_${index + 1}`).toLowerCase().replaceAll(' ', '_'),
    unit: row.unit || row.unit_name || String(row.label || '').replace(/\s*\(.*/, '') || '',
    parent_key: row.parent_key || row.parent || row.contains_unit || 'base',
    conversion_quantity: row.conversion_quantity ?? row.contains_quantity ?? row.contains ?? row.qty ?? row.factor ?? row.conversion_factor ?? 1,
    barcode: row.barcode || row.secondary_barcode || row.qr_code || '',
    purchase_price: row.purchase_price ?? row.unit_cost_price ?? row.cost_price ?? '',
    sale_price: row.sale_price ?? row.unit_sale_price ?? row.price ?? '',
  }));
  const previewRows = hierarchyPackagingUnits(rows.map((row) => ({ ...row, conversion_quantity: row.conversion_quantity === '' ? 1 : row.conversion_quantity })), { unit: baseLabel });
  const options = [{ key: 'base', label: baseLabel }, ...rows.map((row) => ({ key: row.key, label: row.unit || row.key }))];
  const saveRows = (nextRows) => onChange('packaging_units', JSON.stringify(nextRows.map((row) => ({
    ...row,
    key: String(row.key || row.unit || '').toLowerCase().replaceAll(' ', '_'),
    conversion_quantity: Math.max(1, safeNumber(row.conversion_quantity, 1)),
  }))));
  const update = (index, key, value) => {
    const nextRows = rows.map((row, rowIndex) => rowIndex === index ? {
      ...row,
      [key]: value,
      ...(key === 'unit' ? { key: String(value || row.key).toLowerCase().replaceAll(' ', '_') } : {}),
    } : row);
    saveRows(nextRows);
  };
  return <div className="packaging-builder"><div className="module-head compact-head"><h3>Packaging Builder</h3><button type="button" className="ghost-btn" onClick={() => saveRows([...rows, { key: `level_${rows.length + 1}`, unit: '', parent_key: rows[rows.length - 1]?.key || 'base', conversion_quantity: 1, barcode: '', purchase_price: '', sale_price: '' }])}><Plus size={14} /> Add Unit</button></div><PackagingPreview baseLabel={baseLabel} rows={previewRows} legacyUnits={product?.units_per_package} /><div className="data-table compact-table"><div className="table-wrap"><table><thead><tr><th>Unit</th><th>Contains</th><th>Parent</th><th>Barcode</th><th>Purchase Price</th><th>Sale Price</th><th>Stock Factor</th><th></th></tr></thead><tbody>{rows.length ? rows.map((row, index) => {
    const preview = previewRows.find((item) => item.key === row.key);
    return <tr key={`${row.key}-${index}`}><td><input className="cell-input" value={row.unit} onChange={(event) => update(index, 'unit', event.target.value)} placeholder="Pet / Box / Carton" /></td><td><input className="cell-input" type="number" min="1" value={row.conversion_quantity} onChange={(event) => update(index, 'conversion_quantity', event.target.value)} /></td><td><select className="cell-input" value={row.parent_key} onChange={(event) => update(index, 'parent_key', event.target.value)}>{options.filter((option) => option.key !== row.key).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></td><td><input className="cell-input" value={row.barcode} onChange={(event) => update(index, 'barcode', event.target.value)} /></td><td><input className="cell-input" type="number" min="0" step="0.01" value={row.purchase_price} onChange={(event) => update(index, 'purchase_price', event.target.value)} /></td><td><input className="cell-input" type="number" min="0" step="0.01" value={row.sale_price} onChange={(event) => update(index, 'sale_price', event.target.value)} /></td><td>{preview?.factor || 1} {pluralUnit(baseLabel)}</td><td><button type="button" className="danger-btn" onClick={() => saveRows(rows.filter((_, rowIndex) => rowIndex !== index))}><Trash2 size={14} /></button></td></tr>;
  }) : <tr><td colSpan="8"><div className="muted">Base unit: {baseLabel}. Add Pet, Box, Carton, Strip, Bag or custom unit levels here.</div></td></tr>}</tbody></table></div></div></div>;
}

function PackagingPreview({ baseLabel, rows, legacyUnits }) {
  const fallbackUnits = Math.max(1, safeNumber(legacyUnits, 1));
  const preview = rows.length ? rows : fallbackUnits > 1 ? [{ key: 'pack', unit: 'Pack', factor: fallbackUnits }] : [];
  return <div className="dashboard-empty"><Boxes size={24} /><strong>Packaging Preview</strong><p>Base Unit: {baseLabel || 'Piece'}</p>{preview.length ? preview.map((row) => <p key={row.key}>{row.unit || row.label}: {Math.max(1, Number(row.factor || 1))} {pluralUnit(baseLabel || 'Piece')}</p>) : <p>Add packaging levels to preview Pack, Box and Carton conversion.</p>}</div>;
}

async function auditProductHydration(product) {
  const products = await listRecords('products');
  const visible = products.some((row) => row.uuid === product.uuid);
  if (visible) return true;
  const payload = {
    uuid: crypto.randomUUID(),
    action: 'product_hydration_miss',
    entity: 'products',
    entity_uuid: product.uuid,
    details: 'Product saved successfully but was not visible after inventory hydration.',
    metadata: product,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  console.warn('Product save succeeded but inventory hydration missed record', payload);
  await saveRecord('audit_logs', payload);
  window.dispatchEvent(new CustomEvent('msm:product-hydration-miss', { detail: product }));
  return false;
}

function duplicateProductConflicts(rows = [], record = {}) {
  const labels = {
    barcode: 'Barcode',
    secondary_barcode: 'Secondary barcode',
    qr_code: 'QR code',
    sku: 'SKU',
    product_code: 'Product code',
    box_barcode: 'Box barcode',
    carton_barcode: 'Carton barcode',
  };
  const conflicts = [];
  for (const field of Object.keys(labels)) {
    const value = String(record?.[field] || '').trim().toLowerCase();
    if (!value) continue;
    const product = rows.find((row) => row.uuid !== record.uuid && String(row?.[field] || '').trim().toLowerCase() === value);
    if (product) conflicts.push({ key: field, field: labels[field], product, value: record[field] });
  }
  return conflicts;
}

function duplicateProductBarcode(rows = [], record = {}) {
  return duplicateProductConflicts(rows, record)[0] || null;
}

function clearDuplicateIdentityFields(record = {}, conflicts = []) {
  const next = { ...record };
  for (const conflict of conflicts) {
    next[conflict.key] = '';
  }
  return calculatedProduct(next);
}

function nonEmptyProductFields(source = {}, target = {}) {
  const allowed = [
    'product_name', 'category', 'brand', 'model', 'pack_size', 'unit', 'variant_type',
    'manufacturer', 'warranty', 'supplier_name', 'low_stock_threshold', 'purchase_price',
    'sale_price', 'packaging_units',
  ];
  return Object.fromEntries(allowed
    .filter((key) => source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '' && !target[key])
    .map((key) => [key, source[key]]));
}

async function auditInventoryAction(action, product, metadata = {}) {
  try {
    await saveRecord('audit_logs', {
      action,
      entity: 'products',
      entity_uuid: product?.uuid || metadata?.target_uuid || crypto.randomUUID(),
      details: `${action}: ${productDisplayName(product || {}) || 'Inventory product'}`,
      metadata: { product, ...metadata },
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Inventory audit log failed', error.message);
  }
}

function DuplicateProductDialog({ warning, onClose, onKeepExisting, onMerge }) {
  const firstProduct = warning?.product || {};
  const conflictText = (warning?.conflicts || [])
    .map((conflict) => `${conflict.field}: ${conflict.value}`)
    .join(', ');
  return <ModalShell onClose={onClose} size="small"><div className="modal-header"><h2>Duplicate Product Warning</h2><button type="button" className="icon-btn" onClick={onClose} title="Close"><X size={17} /></button></div><div className="modal-body"><p className="muted">This product shares an identity field with an existing product. Same-name products are allowed, but barcode, SKU, QR and product code values must stay unique inside this shop.</p><div className="lookup-selected"><strong>{productDisplayName(firstProduct)}</strong><span>{conflictText}</span></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={onClose}>Cancel</button><div className="button-row"><button type="button" className="ghost-btn" onClick={onMerge}>Merge Product</button><button type="button" className="primary-btn" onClick={onKeepExisting}>Keep Existing</button></div></div></ModalShell>;
}

function UniversalProductLookup({ value, onChange, onPick, data, placeholder = 'Scan / Search Product', autoFocus = false }) {
  const [lookup, setLookup] = useState(null);
  const [loading, setLoading] = useState(false);
  const term = String(value || '').trim();

  useEffect(() => {
    if (term.length < 2) {
      setLookup(null);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await barcodeLookup(term, data, { limit: 8 });
        if (active) setLookup(result);
      } catch {
        if (active) setLookup(null);
      } finally {
        if (active) setLoading(false);
      }
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [term, data]);

  const matches = lookup?.results?.length ? lookup.results : (lookup?.product || lookup?.medicine || lookup?.catalog ? [lookup] : []);
  const first = matches[0];

  function choose(match) {
    if (!match) return;
    onPick?.(match);
    setLookup(null);
  }

  return <div className="lookup-box"><input autoFocus={autoFocus} autoComplete="off" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); choose(first); } }} />{term.length >= 2 && <div className="lookup-results">{loading && <span className="muted">Searching...</span>}{!loading && matches.map((match, index) => <button type="button" className="lookup-result" key={`${match.match_type}-${match.product?.uuid || match.imei?.uuid || match.medicine?.uuid || match.catalog?.uuid || index}`} onClick={() => choose(match)}><strong>{lookupTitle(match)}</strong><span>{lookupMeta(match)}</span></button>)}{!loading && !matches.length && <span className="muted">No product found</span>}</div>}</div>;
}

function lookupTitle(match = {}) {
  const product = match.product || {};
  const medicine = match.medicine || {};
  const catalog = match.catalog || {};
  if (product.uuid || product.product_name) return productDisplayName(product);
  if (medicine.uuid || medicine.brand_name) return productDisplayName({ product_name: medicine.brand_name, brand: medicine.manufacturer || medicine.generic_name, pack_size: medicine.strength, unit: medicine.dosage_form });
  if (catalog.uuid || catalog.product_name || catalog.name) return productDisplayName(catalog);
  return 'Matched item';
}

function lookupMeta(match = {}) {
  const product = match.product || {};
  const medicine = match.medicine || {};
  const catalog = match.catalog || {};
  const stock = product.uuid ? `Stock ${product.quantity ?? 0}` : medicine.uuid ? `Stock ${medicine.quantity ?? medicine.stock ?? 0}` : '';
  const price = product.uuid ? money(product.sale_price || 0) : medicine.uuid ? money(medicine.sale_price || medicine.mrp || 0) : money(catalog.default_price || 0);
  const pack = match.packaging_unit?.label || product.pack_size || medicine.pack_size || catalog.pack_size || product.unit || catalog.unit || '';
  return [match.match_type, product.brand || medicine.manufacturer || catalog.brand, product.category || medicine.category || catalog.category, pack, stock, price].filter(Boolean).join(' - ');
}

function DeleteDialog({ row, store, onClose, onDelete }) {
  const label = row.product_name || row.name || row.invoice_number || row.job_number || row.receipt_number || row.supplier_name || row.email || row.uuid;
  return <ModalShell onClose={onClose} size="small"><div className="modal-header"><h2>Delete {store.replaceAll('_', ' ')}</h2><button type="button" className="icon-btn" onClick={onClose} title="Close"><X size={17} /></button></div><div className="modal-body"><p className="muted">Choose how to delete <strong>{label}</strong>. Soft delete hides it and keeps audit history. Permanent delete is admin-only and removes the local record.</p></div><div className="modal-footer"><button className="ghost-btn" onClick={onClose}>Cancel</button><div className="button-row"><button className="danger-btn" onClick={() => onDelete('soft')}><Trash2 size={16} /> Soft Delete</button>{ADMIN_USER && <button className="danger-btn solid" onClick={() => onDelete('permanent')}><Trash2 size={16} /> Permanent Delete</button>}</div></div></ModalShell>;
}

function ModalShell({ children, onClose, size = '' }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><div className={`modal ${size}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>;
}

function notify(message) {
  window.dispatchEvent(new CustomEvent('dsh:toast', { detail: message }));
}

async function deleteEverywhere(store, row, mode) {
  await deleteRecord(store, row.uuid, mode);
  window.dispatchEvent(new CustomEvent('msm:record-deleted', { detail: { store, uuid: row.uuid, mode } }));
  if (navigator.onLine && localStorage.getItem('dsh_token')) {
    try {
      await deleteRemoteRecord(store, row.uuid, mode);
      await syncNow();
      window.dispatchEvent(new CustomEvent('msm:record-delete-synced', { detail: { store, uuid: row.uuid, mode } }));
    } catch (error) {
      console.warn(error.message || 'Remote delete failed. It will retry later.');
      notify(error.message || 'Remote delete failed. It will retry later.');
    }
  }
}

function runInBackground(task, successMessage) {
  task()
    .then(() => successMessage && notify(successMessage))
    .catch((error) => {
      console.warn(error.message || 'Background sync failed. It will retry later.');
      if (successMessage) notify(error.message || 'Background sync failed. It will retry later.');
    });
}

function POS2({ data, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [scan, setScan] = useState('');
  const [cart, setCart] = useState([]);
  const [payment, setPayment] = useState({ customer_uuid: '', payment_type: 'cash', discount: 0, tax: brand?.tax || 0, paid: 0, due_date: '' });
  const [quick, setQuick] = useState({ name: '', phone: '', address: '', cnic: '', notes: '' });
  const [customerOpen, setCustomerOpen] = useState(false);
  const [receiptFormat, setReceiptFormat] = useState(brand?.receipt_format || '80mm');
  const isTraders = businessTypeKey(brand?.business_type) === 'traders';
  const rules = businessTypeRules(brand);
  const products = filterRows(data.products || [], query, rules.posSearch);
  const customerOptions = isTraders ? (data.trader_retailers || []).map((item) => ({ ...item, name: item.shop_name || item.owner_name })) : (data.customers || []);
  const customer = customerOptions.find((item) => item.uuid === payment.customer_uuid);
  const subtotal = cart.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0);
  const total = subtotal - Number(payment.discount || 0) + Number(payment.tax || 0);
  const paid = payment.payment_type === 'credit' ? 0 : Number(payment.paid === '' ? total : payment.paid || total);
  const changeReturn = Math.max(0, paid - total);
  const dueAmount = Math.max(0, total - paid);
  const draftInvoice = invoiceWithPaymentMeta({ invoice_number: 'DRAFT', customer_name: customer?.name || quick.name || 'Walk-in Customer', subtotal, discount: payment.discount, tax: payment.tax, total, paid, sold_at: new Date().toISOString() }, payment);
  const usesImeiTracking = businessTypeKey(brand?.business_type) === 'mobile_shop';

  function addToCart(product, match = {}) {
    const unit = unitForMatch(product, match);
    const cartKey = match.imei?.uuid || `${product.uuid}:${unit.key}`;
    const quantity = 1;
    const stockQuantity = unit.factor;
    setCart((items) => items.some((item) => item.cart_key === cartKey)
      ? items.map((item) => item.cart_key === cartKey ? { ...item, quantity: Number(item.quantity || 0) + quantity, stock_quantity: Number(item.stock_quantity || 0) + stockQuantity } : item)
      : [...items, {
        cart_key: cartKey,
        product_uuid: product.uuid,
        product_name: productDisplayName(product),
        ...(usesImeiTracking ? { imei_uuid: match.imei?.uuid, imei: match.imei?.imei_1 || product.imei, imei_numbers: match.imei ? imeiListText(match.imei) : imeiListText(product) } : {}),
        ...(rules.showBatch ? { batch_number: product.batch_number || match.product?.batch_number } : {}),
        ...(rules.showExpiry ? { expiry_date: product.expiry_date || match.product?.expiry_date } : {}),
        quantity,
        price: unit.sale_price,
        stock_quantity: stockQuantity,
        available_stock: stockAvailableLabel(product),
        base_unit: unit.base_unit || productBaseUnit(product),
        selected_unit_key: unit.key,
        selected_unit: unit.unit,
        selected_unit_label: unit.label,
        conversion_factor: unit.factor,
        unit_barcode: unit.barcode,
        packaging_options: packagingUnits(product),
      }]);
  }

  function updateCartLine(row, key, value) {
    setCart((items) => items.map((item) => {
      if (item.cart_key !== row.cart_key) return item;
      if (key === 'quantity') {
        const quantity = Math.max(1, Number(value || 1));
        return { ...item, quantity, stock_quantity: quantity * Number(item.conversion_factor || 1) };
      }
      if (key === 'selected_unit') {
        const unit = (item.packaging_options || []).find((option) => option.key === value || option.unit === value) || item.packaging_options?.[0];
        if (!unit) return item;
        const quantity = Math.max(1, Number(item.quantity || 1));
        return {
          ...item,
          cart_key: `${item.product_uuid}:${unit.key}`,
          selected_unit_key: unit.key,
          selected_unit: unit.unit,
          selected_unit_label: unit.label,
          conversion_factor: unit.factor,
          unit_barcode: unit.barcode,
          price: unit.sale_price,
          base_unit: unit.base_unit || item.base_unit || 'Piece',
          stock_quantity: quantity * unit.factor,
        };
      }
      return { ...item, [key]: ['price'].includes(key) ? Number(value) : value };
    }));
  }

  function scanToCart(match) {
    try {
      if (!match.product?.uuid) {
        notify('Scanned item is in catalog only. Add it to inventory before sale.');
        return;
      }
      addToCart(match.product, match);
      setScan('');
      notify(`Added ${productDisplayName(match.product)}`);
    } catch (error) {
      notify(error.message || 'Barcode scan failed');
    }
  }

  async function completeSale() {
    const retailer = isTraders ? customer : null;
    const sale = await createSale({ ...payment, paid, retailer_uuid: retailer?.uuid || payment.customer_uuid, retailer_name: retailer?.shop_name || retailer?.name, route_uuid: retailer?.route_uuid, route_name: retailer?.route_name, territory_uuid: retailer?.territory_uuid, territory_name: retailer?.territory_name, cart });
    const printableSale = invoiceWithPaymentMeta({ ...sale, customer_name: sale.customer_name || customer?.name || quick.name || 'Walk-in Customer', subtotal, discount: payment.discount, tax: payment.tax, total: sale.total ?? total, paid }, payment);
    setCart([]);
    setPayment({ customer_uuid: '', payment_type: 'cash', discount: 0, tax: brand?.tax || 0, paid: 0, due_date: '' });
    await refresh();
    printInvoice(printableSale, cart, brand, receiptFormat);
  }

  async function createWalkIn() {
    const customerRecord = await quickCustomer(quick);
    setPayment({ ...payment, customer_uuid: customerRecord.uuid });
    setQuick({ name: '', phone: '', address: '', cnic: '', notes: '' });
    setCustomerOpen(false);
    await refresh();
  }

  function shareInvoiceOnWhatsApp() {
    const phone = quick.phone || customer?.phone || customer?.whatsapp || customer?.contact_number;
    const message = `${invoiceMessage(draftInvoice, brand, cart)}\n\nPDF Bill: use PDF Bill button and attach the downloaded invoice if needed.`;
    const result = whatsAppShare(phone, message);
    if (result) console.info('WhatsApp phone normalization result', { input: phone, normalized: result.normalizedPhone });
  }

  useEffect(() => {
    const handler = (event) => {
      if (event.key === 'F1') { event.preventDefault(); setCart([]); }
      if (event.key === 'F2') { event.preventDefault(); document.querySelector('[data-customer-select]')?.focus(); }
      if (event.key === 'F3') { event.preventDefault(); document.querySelector('[data-product-search]')?.focus(); }
      if (event.key === 'F4') { event.preventDefault(); document.querySelector('[data-paid-input]')?.focus(); }
      if (event.key === 'F5') { event.preventDefault(); if (cart.length) printInvoice(draftInvoice, cart, brand, receiptFormat); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart, payment, quick, brand, receiptFormat]);

  return (
    <div className="pos-grid smart-pos">
      <section className="panel">
        <div className="module-head">
          <h2>Modern POS</h2>
          <span className="shortcut-pill"><Keyboard size={15} /> F1 New - F2 Customer - F3 Product - F4 Checkout - F5 Print</span>
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder="Product search, barcode, SKU or serial" inputProps={{ 'data-product-search': true }} />
        <UniversalProductLookup autoFocus value={scan} data={data} onChange={setScan} onPick={scanToCart} />
        <div className="product-picker">
          {products.length ? products.map((product) => (
            <button key={product.uuid} onClick={() => addToCart(product)}>
              <div className="product-thumb">{product.image ? <img src={product.image} alt="" /> : <Smartphone size={22} />}</div>
              <strong>{productDisplayName(product)}</strong>
              <span>{product.barcode || product.secondary_barcode || product.sku || product.product_code || (rules.showImei ? imeiListText(product) : '')}</span>
              <b>{money(product.sale_price)}</b>
              <small>Available: {stockAvailableLabel(product)}</small>
            </button>
          )) : <EmptyRows />}
        </div>
      </section>

      <section className="panel cart-panel">
        <div className="module-head">
          <h2>Quick Cart & Fast Checkout</h2>
          <select value={receiptFormat} onChange={(event) => setReceiptFormat(event.target.value)}>
            <option value="58mm">58mm Thermal</option>
            <option value="80mm">80mm Thermal</option>
            <option value="a4">A4 Invoice</option>
          </select>
        </div>
        <DataTable
          rows={cart}
          columns={rules.posCartColumns}
          actions={(row) => <button className="danger-btn" onClick={() => setCart(cart.filter((item) => item.cart_key !== row.cart_key))}><Trash2 size={15} /></button>}
          editable={updateCartLine}
        />

        <div className="customer-collapsible">
          <button type="button" className="ghost-btn" onClick={() => setCustomerOpen(true)}><Plus size={15} /> Quick Add Customer</button>
          <label>{isTraders ? 'Retailer' : 'Customer'}
            <select data-customer-select value={payment.customer_uuid} onChange={(e) => setPayment({ ...payment, customer_uuid: e.target.value })}>
              <option value="">{isTraders ? 'Select retailer' : 'Walk-in Customer'}</option>
              {customerOptions.map((item) => <option key={item.uuid} value={item.uuid}>{item.name || item.shop_name} {item.phone ? `- ${item.phone}` : ''}</option>)}
            </select>
          </label>
        </div>

        <div className="form-grid">
          <label>Payment<select value={payment.payment_type} onChange={(e) => setPayment({ ...payment, payment_type: e.target.value })}><option value="cash">Cash</option><option value="credit">Credit</option><option value="partial">Partial</option></select></label>
          <label>Discount<input type="number" value={payment.discount} onChange={(e) => setPayment({ ...payment, discount: e.target.value })} /></label>
          <label>Tax<input type="number" value={payment.tax} onChange={(e) => setPayment({ ...payment, tax: e.target.value })} /></label>
          <label>Paid<input data-paid-input type="number" value={payment.payment_type === 'credit' ? 0 : payment.paid || total} onChange={(e) => setPayment({ ...payment, paid: e.target.value })} /></label>
          <label>Due Date<input type="date" value={payment.due_date} onChange={(e) => setPayment({ ...payment, due_date: e.target.value })} /></label>
        </div>

        <div className="payment-summary">
          <span>Subtotal <strong>{money(subtotal)}</strong></span>
          <span>Discount <strong>{money(payment.discount)}</strong></span>
          <span>Tax <strong>{money(payment.tax)}</strong></span>
          <span>Grand Total <strong>{money(total)}</strong></span>
          <span>Paid Amount <strong>{money(paid)}</strong></span>
          <span className={changeReturn > 0 ? 'ok' : dueAmount > 0 ? 'bad' : ''}>{changeReturn > 0 ? 'Change Return' : 'Due Amount'} <strong>{money(changeReturn > 0 ? changeReturn : dueAmount)}</strong></span>
        </div>

        <div className="button-row pos-actions">
          <button className="primary-btn" disabled={!cart.length} onClick={completeSale}><ReceiptText size={18} /> Complete Sale</button>
          <button className="ghost-btn" disabled={!cart.length} onClick={() => printInvoice(draftInvoice, cart, brand, receiptFormat)}><Printer size={16} /> Print Bill</button>
          <button className="ghost-btn" disabled={!cart.length} onClick={() => downloadPdf('invoice.pdf', 'Sales Invoice', invoicePdfLines(draftInvoice, cart, brand))}><FileDown size={16} /> PDF Bill</button>
          <button className="ghost-btn" disabled={!cart.length} onClick={shareInvoiceOnWhatsApp}><MessageCircle size={16} /> WhatsApp Bill</button>
        </div>
      </section>

      {customerOpen && <ModalShell onClose={() => setCustomerOpen(false)} size="small"><form onSubmit={(event) => { event.preventDefault(); createWalkIn(); }}><div className="modal-header"><h2>Quick Add Customer</h2><button type="button" className="icon-btn" onClick={() => setCustomerOpen(false)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Name<input placeholder="Name" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} /></label><label>Phone<input placeholder="Phone" value={quick.phone} onChange={(e) => setQuick({ ...quick, phone: e.target.value })} /></label><label>Address<input placeholder="Address" value={quick.address} onChange={(e) => setQuick({ ...quick, address: e.target.value })} /></label><label>CNIC<input placeholder="CNIC" value={quick.cnic} onChange={(e) => setQuick({ ...quick, cnic: e.target.value })} /></label><label>Notes<input placeholder="Notes" value={quick.notes} onChange={(e) => setQuick({ ...quick, notes: e.target.value })} /></label></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setCustomerOpen(false)}>Cancel</button><button className="primary-btn" disabled={!quick.name && !quick.phone}>Create Customer</button></div></form></ModalShell>}
    </div>
  );
}

function Credit({ data, refresh }) {
  const [payment, setPayment] = useState({ customer_uuid: '', amount: '', method: 'Cash', notes: '' });
  const [deleting, setDeleting] = useState(null);
  const [receiving, setReceiving] = useState(false);
  const due = (data.customers || []).filter((customer) => Number(customer.balance || 0) > 0);
  async function submit(e) {
    e.preventDefault();
    await receiveCustomerPayment(payment);
    setPayment({ customer_uuid: '', amount: '', method: 'Cash', notes: '' });
    setReceiving(false);
    await refresh();
    notify('Payment received successfully');
  }
  async function removeLedger(row, mode) {
    await deleteEverywhere('customer_ledgers', row, mode);
    setDeleting(null);
    await refresh();
    notify('Credit record deleted successfully');
  }
  return <div className="stack"><section className="panel"><div className="module-head"><h2>Outstanding Balance</h2><button className="primary-btn" onClick={() => setReceiving(true)}><Plus size={16} /> Receive Payment</button></div><DataTable rows={due} columns={['name', 'phone', 'balance']} actions={(row) => <button className="ghost-btn" onClick={() => printLedger(row, data.customer_ledgers || [])}><Printer size={15} /> Statement</button>} /><h2 className="section-title">Credit Records</h2><DataTable rows={data.customer_ledgers || []} columns={['type', 'amount', 'reference', 'due_date', 'entry_at']} actions={(row) => <button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button>} />{deleting && <DeleteDialog row={deleting} store="customer_ledgers" onClose={() => setDeleting(null)} onDelete={(mode) => removeLedger(deleting, mode)} />}</section>{receiving && <ModalShell onClose={() => setReceiving(false)}><form onSubmit={submit}><div className="modal-header"><h2>Receive Payment</h2><button type="button" className="icon-btn" onClick={() => setReceiving(false)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Customer<select required value={payment.customer_uuid} onChange={(e) => setPayment({ ...payment, customer_uuid: e.target.value })}><option value="">Select customer</option>{due.map((customer) => <option key={customer.uuid} value={customer.uuid}>{customer.name} - {money(customer.balance)}</option>)}</select></label><label>Amount<input required type="number" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></label><label>Method<input value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} /></label><label>Notes<input value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setReceiving(false)}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>}</div>;
}

function Sales({ rows, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const filtered = useMemo(() => filterRows(rows, query, ['invoice_number', 'customer_name', 'payment_type', 'status']), [rows, query]);
  const fields = [['invoice_number', 'Invoice Number'], ['customer_name', 'Customer Name'], ['payment_type', 'Payment Type', 'select', true, ['cash', 'credit', 'partial']], ['subtotal', 'Subtotal', 'number'], ['discount', 'Discount', 'number'], ['tax', 'Tax', 'number'], ['total', 'Total', 'number', true], ['paid', 'Paid', 'number'], ['balance', 'Balance', 'number'], ['status', 'Status', 'select', true, ['Paid', 'Credit Due']]];
  async function submit(record) {
    await saveRecord('sales', { ...record, sold_at: record.sold_at || new Date().toISOString() });
    setEditing(null);
    await refresh();
    notify('Sale saved successfully');
  }
  async function remove(row, mode) {
    await deleteEverywhere('sales', row, mode);
    setDeleting(null);
    await refresh();
    notify('Sale deleted successfully');
  }
  return <div className="stack"><section className="panel"><ModuleHeader title="Sales Records" query={query} setQuery={setQuery} onAdd={() => setEditing({ invoice_number: `MANUAL-${Date.now()}`, payment_type: 'cash', status: 'Paid' })} onExport={() => exportCsv('sales.csv', filtered)} onPrint={() => printTable('Sales Records', filtered, ['invoice_number', 'customer_name', 'total', 'paid', 'balance', 'status'])} /><DataTable rows={filtered} columns={['invoice_number', 'customer_name', 'payment_type', 'total', 'paid', 'balance', 'status', 'sold_at']} onAdd={() => setEditing({ invoice_number: `MANUAL-${Date.now()}`, payment_type: 'cash', status: 'Paid' })} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => printInvoice(row, [], brand)}><Printer size={15} /> Invoice</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title="Sale Detail" row={viewing} columns={['invoice_number', 'customer_name', 'payment_type', 'subtotal', 'discount', 'tax', 'total', 'paid', 'balance', 'status', 'sold_at']} onClose={() => setViewing(null)} />}{editing && <RecordModal title="Sales Record" fields={fields} record={editing} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store="sales" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function Repairs({ rows, refresh }) {
  return <CrudModule config={RESOURCES.repairs} rows={rows} refresh={refresh} extraActions={(row) => <><button className="ghost-btn" onClick={() => printJobCard(row)}><Printer size={15} /> Job Card</button><select className="mini-select" value={row.status || 'Received'} onChange={async (e) => { await updateRepairStatus(row, e.target.value, 'Status updated'); await refresh(); }}>{['Received', 'Diagnosed', 'In Progress', 'Waiting Parts', 'Completed', 'Delivered'].map((status) => <option key={status}>{status}</option>)}</select></>} />;
}

function ReturnsModule({ data, refresh }) {
  return <div className="stack"><CrudModule config={RESOURCES.sale_returns} rows={data.sale_returns || []} refresh={refresh} /><CrudModule config={RESOURCES.purchase_returns} rows={data.purchase_returns || []} refresh={refresh} /></div>;
}

function ManualRepairReceipts({ rows, brand, refresh }) {
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const fields = [
    ['receipt_number', 'Receipt Number'], ['date', 'Date', 'date'], ['customer_name', 'Customer Name', 'text', true], ['phone', 'Phone Number'],
    ['device_name', 'Device Name', 'text', true], ['imei', 'IMEI Number'], ['problem', 'Problem Description'], ['repair_charges', 'Repair Charges', 'number', true],
    ['advance_payment', 'Advance Payment', 'number'], ['technician', 'Technician Name'], ['delivery_date', 'Delivery Date', 'date'], ['template', 'Template', 'select', true, ['Thermal Receipt', 'A4 Receipt']],
    ['status', 'Status', 'select', true, ['Received', 'In Progress', 'Completed', 'Delivered']], ['notes', 'Notes'],
  ];
  const filtered = useMemo(() => filterRows(rows, query, ['receipt_number', 'customer_name', 'phone', 'device_name', 'imei', 'problem', 'technician']), [rows, query]);
  async function submit(record) {
    const saved = await createManualRepairReceipt(record);
    setEditing(null);
    await refresh();
    printRepairReceipt(saved, brand);
    notify('Repair receipt saved successfully');
  }
  async function remove(row, mode) {
    await deleteEverywhere('manual_repair_receipts', row, mode);
    setDeleting(null);
    await refresh();
    notify('Repair receipt deleted successfully');
  }
  return <div className="stack"><section className="panel"><ModuleHeader title="Manual Repair Receipt System" query={query} setQuery={setQuery} onAdd={() => setEditing({ date: new Date().toISOString().slice(0, 10), template: 'Thermal Receipt', status: 'Received' })} onExport={() => exportCsv('manual_repair_receipts.csv', filtered)} onPrint={() => printTable('Repair Receipts', filtered, ['receipt_number', 'customer_name', 'phone', 'device_name', 'repair_charges', 'advance_payment', 'remaining_amount'])} /><DataTable rows={filtered} columns={['receipt_number', 'date', 'customer_name', 'phone', 'device_name', 'imei', 'repair_charges', 'advance_payment', 'remaining_amount', 'technician', 'delivery_date', 'status']} onAdd={() => setEditing({ date: new Date().toISOString().slice(0, 10), template: 'Thermal Receipt', status: 'Received' })} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => setEditing(row)}><Edit3 size={15} /> Edit</button><button className="ghost-btn" onClick={() => printRepairReceipt(row, brand)}><Printer size={15} /> Print</button><button className="ghost-btn" onClick={() => downloadPdf(`${row.receipt_number}.pdf`, `Repair Receipt ${row.receipt_number}`, repairReceiptPdfLines(row, brand))}><FileDown size={15} /> PDF</button><button className="ghost-btn" onClick={() => whatsAppShare(row.phone, repairReceiptMessage(row, brand))}><MessageCircle size={15} /> WhatsApp</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title="Repair Receipt Detail" row={viewing} columns={['receipt_number', 'date', 'customer_name', 'phone', 'device_name', 'imei', 'problem', 'repair_charges', 'advance_payment', 'remaining_amount', 'technician', 'delivery_date', 'status']} onClose={() => setViewing(null)} />}{editing && <RecordModal title="Manual Repair Receipt" fields={fields} record={editing} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store="manual_repair_receipts" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function Purchases({ data, refresh }) {
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({ supplier_uuid: '', invoice_number: '', paid: 0 });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [query, setQuery] = useState('');
  const total = cart.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.cost_price || 0), 0);
  const filtered = useMemo(() => filterRows(data.purchases || [], query, ['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status']), [data.purchases, query]);
  async function submit(e) {
    e.preventDefault();
    await createPurchase({ ...form, cart });
    setCart([]);
    setForm({ supplier_uuid: '', invoice_number: '', paid: 0 });
    setCreating(false);
    await refresh();
    notify('Purchase saved successfully');
  }
  async function remove(row, mode) {
    await deleteEverywhere('purchases', row, mode);
    setDeleting(null);
    await refresh();
    notify('Purchase deleted successfully');
  }
  function closeCreate() {
    setCreating(false);
  }
  function addPurchaseLine(item) {
    const cartKey = item.cart_key || `${item.product_uuid}:${item.imei_numbers || 'product'}`;
    setCart((current) => {
      const existing = current.find((row) => row.cart_key === cartKey);
      if (!existing) return [...current, { ...item, cart_key: cartKey }];
      return current.map((row) => row.cart_key === cartKey ? { ...row, quantity: Number(row.quantity || 0) + Number(item.quantity || 1), stock_quantity: Number(row.stock_quantity || 0) + lineStockQuantity(item), cost_price: item.cost_price || row.cost_price } : row);
    });
  }
  return <div className="stack"><section className="panel"><ModuleHeader title="Purchase Management" query={query} setQuery={setQuery} onAdd={() => setCreating(true)} onExport={() => exportCsv('purchases.csv', filtered)} onPrint={() => printTable('Purchases', filtered, ['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status'])} /><DataTable rows={filtered} columns={['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status']} onAdd={() => setCreating(true)} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => printPurchaseReceipt(row)}><Printer size={15} /> Receipt</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title="Purchase Detail" row={viewing} columns={['invoice_number', 'supplier_name', 'total', 'paid', 'balance', 'status', 'purchased_at']} onClose={() => setViewing(null)} />}{creating && <ModalShell onClose={closeCreate}><form onSubmit={submit}><div className="modal-header"><h2>Add Purchase</h2><button type="button" className="icon-btn" onClick={closeCreate} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid"><label>Supplier<select value={form.supplier_uuid} onChange={(e) => setForm({ ...form, supplier_uuid: e.target.value })}><option value="">Select supplier</option>{(data.suppliers || []).map((supplier) => <option key={supplier.uuid} value={supplier.uuid}>{supplier.supplier_name}</option>)}</select></label><label>Invoice Number<input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></label><label>Paid<input type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} /></label></div><ProductLine products={data.products || []} data={data} onAdd={addPurchaseLine} /><DataTable rows={cart} columns={['product_name', 'selected_unit', 'stock_quantity', 'quantity', 'cost_price']} actions={(row) => <button type="button" className="danger-btn" onClick={() => setCart(cart.filter((item) => item.cart_key !== row.cart_key))}><Trash2 size={15} /></button>} /><div className="totals"><strong>Total {money(total)}</strong></div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={closeCreate}>Cancel</button><button className="primary-btn" disabled={!cart.length}>Save</button></div></form></ModalShell>}{deleting && <DeleteDialog row={deleting} store="purchases" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function ProductLine({ products, onAdd, data }) {
  const [line, setLine] = useState({ product_uuid: '', quantity: 1, cost_price: 0, imei_numbers: '', selected_unit_key: 'base' });
  const [scan, setScan] = useState('');
  const product = products.find((item) => item.uuid === line.product_uuid);
  const units = product ? packagingUnits(product) : [];
  const selectedUnit = units.find((unit) => unit.key === line.selected_unit_key) || units[0];
  const manualQuantity = Math.max(1, Number(line.quantity || 1));
  const manualStockQuantity = manualQuantity * Number(selectedUnit?.factor || 1);

  function selectProduct(uuid) {
    const nextProduct = products.find((item) => item.uuid === uuid);
    const unit = nextProduct ? packagingUnits(nextProduct)[0] : null;
    setLine({
      ...line,
      product_uuid: uuid,
      selected_unit_key: unit?.key || 'base',
      cost_price: unit?.purchase_price || nextProduct?.purchase_price || 0,
    });
  }

  function addManualProduct() {
    if (!product || !selectedUnit) return;
    onAdd({
      ...line,
      quantity: manualQuantity,
      cart_key: `${line.product_uuid}:${selectedUnit.key}:${line.imei_numbers || 'manual'}`,
      product_name: productDisplayName(product),
      stock_quantity: manualStockQuantity,
      selected_unit_key: selectedUnit.key,
      selected_unit: selectedUnit.unit,
      selected_unit_label: selectedUnit.label,
      conversion_factor: selectedUnit.factor,
      unit_barcode: selectedUnit.barcode,
      cost_price: Number(line.cost_price || selectedUnit.purchase_price || product.purchase_price || 0),
    });
  }

  function addScannedProduct(match) {
    try {
      if (!match.product?.uuid) {
        notify('Scanned item is in catalog only. Add it to inventory first.');
        return;
      }
      const unit = unitForMatch(match.product, match);
      onAdd({
        cart_key: match.imei?.uuid || `${match.product.uuid}:${unit.key}`,
        product_uuid: match.product.uuid,
        product_name: productDisplayName(match.product),
        quantity: 1,
        stock_quantity: unit.factor,
        selected_unit_key: unit.key,
        selected_unit: unit.unit,
        selected_unit_label: unit.label,
        conversion_factor: unit.factor,
        unit_barcode: unit.barcode,
        cost_price: unit.purchase_price || Number(match.product.purchase_price || match.product.cost_price || 0),
        imei_numbers: match.imei ? imeiListText(match.imei) : '',
      });
      setScan('');
    } catch (error) {
      notify(error.message || 'Purchase scan failed');
    }
  }
  return <div className="stack compact"><UniversalProductLookup value={scan} data={data || { products }} onChange={setScan} onPick={addScannedProduct} /><div className="inline-form"><select value={line.product_uuid} onChange={(e) => selectProduct(e.target.value)}><option value="">Product</option>{products.map((item) => <option key={item.uuid} value={item.uuid}>{productDisplayName(item)}</option>)}</select><select value={selectedUnit?.key || 'base'} disabled={!units.length} onChange={(e) => {
    const unit = units.find((item) => item.key === e.target.value) || units[0];
    setLine({ ...line, selected_unit_key: unit?.key || 'base', cost_price: unit?.purchase_price || line.cost_price });
  }}>{units.map((unit) => <option key={unit.key} value={unit.key}>{unit.label}</option>)}</select><input type="number" min="1" value={line.quantity} onChange={(e) => setLine({ ...line, quantity: e.target.value })} /><input type="number" value={line.cost_price} onChange={(e) => setLine({ ...line, cost_price: e.target.value })} /><input placeholder="IMEI numbers" value={line.imei_numbers} onChange={(e) => setLine({ ...line, imei_numbers: e.target.value })} /><span className="shortcut-pill">Stock +{manualStockQuantity || 0}</span><button type="button" className="ghost-btn" onClick={addManualProduct} disabled={!product}><Plus size={15} /> Add</button></div></div>;
}

function Notifications({ data, refresh, auth }) {
  const [items, setItems] = useState([]);
  useEffect(() => { notificationCenter().then(setItems); }, [data]);
  const visibleItems = auth?.role === 'Super Admin' ? items.filter((item) => item.type === 'License Renewal') : items;
  async function dismiss(item) {
    if (!String(item.uuid).includes('-')) await deleteEverywhere('notifications', item, 'soft');
    await saveRecord('notifications', { uuid: crypto.randomUUID(), title: item.title, body: item.body, type: item.type, dismissed_source: item.uuid, deleted_at: new Date().toISOString() });
    await refresh?.();
    setItems((current) => current.filter((row) => row.uuid !== item.uuid));
  }
  return <section className="panel"><div className="module-head"><h2>Notification Center</h2><span className="status-pill ok"><Bell size={15} /> {visibleItems.length} active</span></div>{visibleItems.length ? <div className="notification-grid">{visibleItems.map((item) => <article key={item.uuid} className={`notification-card ${item.priority || ''}`}><strong>{item.type}</strong><h3>{item.title}</h3><p>{item.body}</p><button className="danger-btn" onClick={() => dismiss(item)}><Trash2 size={15} /> Delete</button></article>)}</div> : <EmptyRows />}</section>;
}

function SettingsPanel({ brand, rows, refresh }) {
  const [form, setForm] = useState(brand || {});
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (brand) setForm(brand); }, [brand]);
  async function submit(e) {
    e.preventDefault();
    await saveBrandSettings(form);
    setEditing(false);
    await refresh();
    notify('Admin settings saved successfully');
  }
  const fields = [
    ['software_name', 'Software Name'], ['business_type', 'Business Type', 'select', SHOP_TYPES], ['shop_name', 'Shop Name'], ['company_name', 'Company Name'], ['owner_name', 'Owner Name'],
    ['phone', 'Phone'], ['whatsapp', 'WhatsApp'], ['contact_number', 'Contact Number'], ['address', 'Address'],
    ['invoice_header', 'Invoice Header'], ['footer', 'Footer'], ['currency', 'Currency'], ['tax', 'Tax', 'number'],
    ['theme_color', 'Theme Color', 'color'], ['receipt_format', 'Receipt Format'], ['invoice_format', 'Invoice Format'],
    ['logo', 'Logo URL'], ['favicon', 'Favicon URL'], ['login_screen', 'Login Screen Image URL'], ['footer_branding', 'Footer Branding'],
  ];
  return <div className="stack"><section className="panel"><div className="module-head"><h2>White Label Settings</h2><div className="module-actions"><span className="shortcut-pill"><Palette size={15} /> Rebrand without code changes</span><button className="primary-btn" onClick={() => setEditing(true)}><Settings size={16} /> Edit Settings</button></div></div><DataTable rows={rows} columns={['key', 'value']} /></section>{editing && <ModalShell onClose={() => setEditing(false)}><form onSubmit={submit}><div className="modal-header"><h2>Edit Admin Settings</h2><button type="button" className="icon-btn" onClick={() => setEditing(false)} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid">{fields.map(([key, label, type = 'text', options]) => <label key={key}>{label}{type === 'select' ? <select value={form[key] || options[0]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>{options.map((item) => <option key={item}>{item}</option>)}</select> : <input type={type} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</label>)}</div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>}</div>;
}

function LicenseManager({ rows, refresh }) {
  const licenseColumns = ['license_key', 'activation_code', 'owner_name', 'business_type', 'sale_price', 'cost_price', 'profit', 'type', 'status', 'expiry_date', 'days_left', 'renewal_state'];
  const newLicenseForm = () => ({ owner_name: '', business_type: 'Mobile Shop', device_id: '', type: '1 Month', status: 'Active', sale_price: 0, cost_price: 0, theme_color: '#14B8A6', logo: '', footer_branding: '' });
  const [form, setForm] = useState(newLicenseForm);
  const [status, setStatus] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const [query, setQuery] = useState('');
  useEffect(() => { activeLicenseStatus().then(setStatus); }, [rows]);
  const licenseRows = useMemo(() => rows.map(enrichLicense), [rows]);
  const filtered = useMemo(() => filterRows(licenseRows, query, licenseColumns), [licenseRows, query]);
  async function submit(e) {
    e.preventDefault();
    try {
      if (form.uuid) {
        const payload = licensePayload(form);
        await saveRecord('licenses', payload);
        await saveRemoteRecord('licenses', payload);
      } else {
        const license = await generateLicense(licensePayload(form));
        await saveRemoteRecord('licenses', license, { forceCreate: true });
      }
      setForm(newLicenseForm());
      setCreating(false);
      await refresh();
      notify('License saved successfully');
    } catch (error) {
      notify(error.message || 'License save failed');
    }
  }
  async function remove(row, mode) {
    await deleteEverywhere('licenses', row, mode);
    setDeleting(null);
    await refresh();
    notify('License deleted successfully');
  }
  async function renew(e) {
    e.preventDefault();
    const type = renewing.renewal_type || renewing.type || '1 Month';
    const renewed = licensePayload({ ...renewing, type, status: 'Active', expiry_date: licenseExpiryForType(type, renewing.expiry_date), renewed_at: new Date().toISOString() });
    await saveRecord('licenses', renewed);
    await saveRemoteRecord('licenses', renewed);
    setRenewing(null);
    await refresh();
    notify('License renewed successfully');
  }
  return (
    <div className="stack">
      <section className="panel">
        <ModuleHeader
          title="License Management"
          query={query}
          setQuery={setQuery}
          onAdd={() => { setForm(newLicenseForm()); setCreating(true); }}
          onExport={() => exportCsv('licenses.csv', filtered)}
          onPrint={() => printTable('Licenses', filtered, licenseColumns)}
        />
        <div className="module-actions report-actions">
          <span className={`status-pill ${status?.valid ? 'ok' : 'bad'}`}><KeyRound size={15} /> {status?.message || 'Checking license'}</span>
        </div>
        <DataTable
          rows={filtered}
          columns={licenseColumns}
          onAdd={() => { setForm(newLicenseForm()); setCreating(true); }}
          actions={(row) => (
            <>
              <button className="ghost-btn" onClick={() => setViewing(row)}>View</button>
              <button className="ghost-btn" onClick={() => { setForm({ ...row, business_type: row.business_type || 'Mobile Shop', device_id: row.device_id || '' }); setCreating(true); }}><Edit3 size={15} /> Edit</button>
              <button className="ghost-btn" onClick={() => setRenewing({ ...row, renewal_type: row.type || '1 Month', sale_price: row.sale_price || 0, cost_price: row.cost_price || 0 })}><KeyRound size={15} /> Renew</button>
              <button className="ghost-btn" onClick={() => downloadPdf(`${row.license_key}.pdf`, 'License Certificate', [`License: ${row.license_key}`, `Activation: ${row.activation_code}`, `Owner: ${row.owner_name}`, `Shop Type: ${row.business_type || 'Mobile Shop'}`, `Device: ${row.device_id}`, `Type: ${row.type}`, `Expiry: ${row.expiry_date}`])}><FileDown size={15} /> PDF</button>
              <button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button>
            </>
          )}
        />
      </section>
      {viewing && <DetailModal title="License Detail" row={viewing} columns={licenseColumns} onClose={() => setViewing(null)} />}
      {creating && (
        <ModalShell onClose={() => setCreating(false)}>
          <form onSubmit={submit}>
            <div className="modal-header">
              <h2>{form.uuid ? 'Edit License' : 'Add License'}</h2>
              <button type="button" className="icon-btn" onClick={() => setCreating(false)} title="Close"><X size={17} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label>Shop Owner<input required value={form.owner_name || ''} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></label>
                <label>Shop Type<select value={form.business_type || 'Mobile Shop'} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>{SHOP_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Device Binding<input placeholder="Blank rakhein, client activation par auto bind hoga" value={form.device_id || ''} onChange={(e) => setForm({ ...form, device_id: e.target.value })} /></label>
                <label>License Type<select value={form.type || '1 Month'} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['1 Month', '6 Months', '1 Year', 'Lifetime'].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Status<select value={form.status || 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Disabled</option></select></label>
                <label>Expiry Date<input type="date" value={form.expiry_date === 'Lifetime' ? '' : form.expiry_date || ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></label>
                <label>Sale Price<input type="number" min="0" value={form.sale_price || 0} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} /></label>
                <label>Cost Price<input type="number" min="0" value={form.cost_price || 0} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></label>
                <label>Profit<input readOnly value={Math.max(0, Number(form.sale_price || 0) - Number(form.cost_price || 0))} /></label>
                <label>Theme Color<input type="color" value={form.theme_color || '#14B8A6'} onChange={(e) => setForm({ ...form, theme_color: e.target.value })} /></label>
                <label>Logo URL<input value={form.logo || ''} onChange={(e) => setForm({ ...form, logo: e.target.value })} /></label>
                <label>Footer Branding<input value={form.footer_branding || ''} onChange={(e) => setForm({ ...form, footer_branding: e.target.value })} /></label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="ghost-btn" onClick={() => setCreating(false)}>Cancel</button>
              <button className="primary-btn">Save</button>
            </div>
          </form>
        </ModalShell>
      )}
      {renewing && (
        <ModalShell onClose={() => setRenewing(null)}>
          <form onSubmit={renew}>
            <div className="modal-header">
              <h2>Renew License</h2>
              <button type="button" className="icon-btn" onClick={() => setRenewing(null)} title="Close"><X size={17} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label>Shop Owner<input readOnly value={renewing.owner_name || ''} /></label>
                <label>Current Expiry<input readOnly value={renewing.expiry_date || ''} /></label>
                <label>Renew For<select value={renewing.renewal_type || '1 Month'} onChange={(e) => setRenewing({ ...renewing, renewal_type: e.target.value })}>{['1 Month', '6 Months', '1 Year', 'Lifetime'].map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>New Expiry<input readOnly value={licenseExpiryForType(renewing.renewal_type || '1 Month', renewing.expiry_date)} /></label>
                <label>Sale Price<input type="number" min="0" value={renewing.sale_price || 0} onChange={(e) => setRenewing({ ...renewing, sale_price: e.target.value })} /></label>
                <label>Cost Price<input type="number" min="0" value={renewing.cost_price || 0} onChange={(e) => setRenewing({ ...renewing, cost_price: e.target.value })} /></label>
                <label>Profit<input readOnly value={Math.max(0, Number(renewing.sale_price || 0) - Number(renewing.cost_price || 0))} /></label>
                <label>Theme Color<input type="color" value={renewing.theme_color || '#14B8A6'} onChange={(e) => setRenewing({ ...renewing, theme_color: e.target.value })} /></label>
                <label>Logo URL<input value={renewing.logo || ''} onChange={(e) => setRenewing({ ...renewing, logo: e.target.value })} /></label>
                <label>Footer Branding<input value={renewing.footer_branding || ''} onChange={(e) => setRenewing({ ...renewing, footer_branding: e.target.value })} /></label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="ghost-btn" onClick={() => setRenewing(null)}>Cancel</button>
              <button className="primary-btn">Renew License</button>
            </div>
          </form>
        </ModalShell>
      )}
      {deleting && <DeleteDialog row={deleting} store="licenses" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}
    </div>
  );
}

function Accounting({ data, refresh }) {
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const debit = (data.cashbook || []).reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const credit = (data.cashbook || []).reduce((sum, row) => sum + Number(row.credit || 0), 0);
  async function remove(row, mode) {
    await deleteEverywhere('cashbook', row, mode);
    setDeleting(null);
    await refresh();
    notify('Cash book entry deleted successfully');
  }
  return <div className="stack"><div className="metric-grid"><div className="metric"><span>Debit Entries</span><strong>{money(debit)}</strong></div><div className="metric"><span>Credit Entries</span><strong>{money(credit)}</strong></div><div className="metric"><span>Daily Closing</span><strong>{money(debit - credit)}</strong></div><div className="metric"><span>Profit & Loss</span><strong>{money((data.sales || []).reduce((sum, row) => sum + Number(row.profit || 0), 0) - (data.expenses || []).reduce((sum, row) => sum + Number(row.amount || 0), 0))}</strong></div></div><section className="panel"><h2>Cash Book</h2><DataTable rows={data.cashbook || []} columns={['type', 'description', 'debit', 'credit', 'entry_at']} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title="Cash Book Detail" row={viewing} columns={['type', 'description', 'debit', 'credit', 'reference', 'entry_at']} onClose={() => setViewing(null)} />}{deleting && <DeleteDialog row={deleting} store="cashbook" onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function Reports({ refreshKey, brand }) {
  const reportTypes = useMemo(() => reportTypesForBusiness(brand), [brand]);
  const [type, setType] = useState(reportTypes[0]);
  const [rows, setRows] = useState([]);
  async function generate(nextType = type) {
    setType(nextType);
    setRows(formatReportRows(nextType, await reportData(nextType)));
  }
  useEffect(() => {
    const safeType = reportTypes.includes(type) ? type : reportTypes[0];
    generate(safeType);
  }, [refreshKey, reportTypes.join('|')]);
  const columns = reportColumns(type, rows);
  return <section className="panel"><ModuleHeader title="Reports" query="" setQuery={() => {}} onAdd={null} onExport={() => exportCsv(`${type}.csv`, rows)} onPrint={() => printTable(type.replaceAll('_', ' '), rows, columns)} /><div className="module-actions report-actions"><button className="ghost-btn" onClick={() => downloadPdf(`${type}.pdf`, type.replaceAll('_', ' '), rowsToPdfLines(rows))}><FileDown size={16} /> Export PDF</button></div><div className="tabs">{reportTypes.map((item) => <button className={type === item ? 'tab active' : 'tab'} key={item} onClick={() => generate(item)}>{item.replaceAll('_', ' ')}</button>)}</div><DataTable rows={rows} columns={columns} /></section>;
}

function reportColumns(type, rows = []) {
  const dedicated = {
    patients: ['token_number', 'patient_name', 'doctor_name', 'visit_date', 'status'],
    daily_patients: ['date', 'count'],
    monthly_patients: ['month', 'count'],
    doctor_performance: ['doctor_name', 'patients', 'revenue'],
    hospital_revenue: ['date', 'revenue', 'paid', 'pending'],
    lab_report_summary: ['test', 'completed', 'pending'],
    radiology_report_summary: ['test', 'completed', 'pending'],
    pharmacy_prescriptions: ['medicine', 'quantity', 'revenue'],
    follow_up_report: ['patient_name', 'doctor_name', 'next_visit'],
    pending_bills: ['token_number', 'patient_name', 'balance'],
  };
  return dedicated[type] || Object.keys(rows[0] || { message: 'No Data Available' }).filter((key) => !['metadata', 'payload', 'deleted_at', 'sync_status'].includes(key)).slice(0, 10);
}

function formatReportRows(type, rows = []) {
  const byDate = (items, field) => Object.entries(items.reduce((acc, row) => {
    const key = String(row[field] || row.created_at || '').slice(0, 10) || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([date, count]) => ({ uuid: date, date, count }));
  const byMonth = (items, field) => Object.entries(items.reduce((acc, row) => {
    const key = String(row[field] || row.created_at || '').slice(0, 7) || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})).map(([month, count]) => ({ uuid: month, month, count }));
  const statusSummary = (items, nameField, label) => Object.entries(items.reduce((acc, row) => {
    const key = row[nameField] || label;
    acc[key] ||= { uuid: key, [label]: key, completed: 0, pending: 0 };
    if (['Completed', 'Reviewed'].includes(row.status)) acc[key].completed += 1;
    else acc[key].pending += 1;
    return acc;
  }, {})).map(([, value]) => value);
  if (type === 'patients') return rows.map((row) => ({ uuid: row.uuid, token_number: row.token_number, patient_name: row.patient_name, doctor_name: row.doctor_name, visit_date: row.visit_date, status: row.status }));
  if (type === 'daily_patients') return byDate(rows, 'visit_date');
  if (type === 'monthly_patients') return byMonth(rows, 'visit_date');
  if (type === 'doctor_performance') return rows.map((row) => ({ uuid: row.doctor_name, doctor_name: row.doctor_name, patients: row.patients_count || row.patients || 0, revenue: row.revenue || 0 }));
  if (type === 'hospital_revenue') return byDate(rows, 'received_at').map((day) => {
    const bills = rows.filter((bill) => String(bill.received_at || bill.updated_at || '').startsWith(day.date));
    return { ...day, revenue: bills.reduce((sum, bill) => sum + Number(bill.grand_total || 0), 0), paid: bills.reduce((sum, bill) => sum + Number(bill.paid || 0), 0), pending: bills.reduce((sum, bill) => sum + Number(bill.balance || 0), 0) };
  });
  if (type === 'lab_report_summary') return statusSummary(rows, 'test_name', 'test');
  if (type === 'radiology_report_summary') return statusSummary(rows, 'study_type', 'test');
  if (type === 'pharmacy_prescriptions') return Object.entries(rows.reduce((acc, row) => ({ ...acc, [row.medicine_name || 'Unknown']: (acc[row.medicine_name || 'Unknown'] || 0) + Number(row.dispensed_quantity || row.days || 1) }), {})).map(([medicine, quantity]) => ({ uuid: medicine, medicine, quantity, revenue: 0 }));
  if (type === 'follow_up_report') return rows.map((row) => ({ uuid: row.uuid, patient_name: row.patient_name, doctor_name: row.doctor_name, next_visit: row.next_visit }));
  if (type === 'pending_bills') return rows.map((row) => ({ uuid: row.uuid, token_number: row.token_number, patient_name: row.patient_name, balance: row.balance }));
  return rows;
}

function reportTypesForBusiness(brand) {
  const type = brand?.business_type || 'General Store';
  const retail = ['daily_sales', 'weekly_sales', 'monthly_sales', 'yearly_sales', 'product_sales', 'top_products', 'profit', 'inventory', 'low_stock', 'near_expiry', 'expired_products', 'customers', 'expenses', 'suppliers', 'purchases', 'customer_ledger', 'supplier_ledger', 'credit_recovery', 'mobile_wallets'];
  const traders = ['route_sales', 'route_recovery', 'route_profit', 'company_wise_sales', 'brand_wise_sales', 'product_wise_sales', 'outstanding_customers', 'recovery_history', 'aging_report', 'salesman_ledger', 'distributor_ledger', 'daily_sales', 'monthly_sales', 'profit', 'inventory'];
  const repair = ['repairs'];
  const pharmacy = ['medicines', 'low_stock_medicines', 'near_expiry_medicines', 'expired_medicines', 'manufacturer_reports', 'category_reports'];
  const hospital = ['patients', 'daily_patients', 'monthly_patients', 'doctor_performance', 'hospital_revenue', 'lab_report_summary', 'radiology_report_summary', 'pharmacy_prescriptions', 'follow_up_report', 'pending_bills', 'top_medicines', 'assistants', 'expenses'];
  if (type === 'Hospital') return hospital;
  if (type === 'Pharmacy') return [...retail, ...pharmacy];
  if (businessTypeKey(type) === 'traders') return traders;
  if (REPAIR_SHOP_TYPES.has(type)) return [...retail, ...repair];
  return retail;
}

function ModuleHeader({ title, query, setQuery, onAdd, onImport, onExport, onPrint }) {
  return <div className="module-head"><h2>{title}</h2><div className="module-actions"><SearchBox value={query} onChange={setQuery} />{onAdd && <button className="primary-btn" onClick={onAdd}><Plus size={16} /> Add</button>}{onImport && <button className="ghost-btn" onClick={onImport}><Upload size={16} /> Import Excel</button>}<button className="ghost-btn" onClick={onExport}><Download size={16} /> Export Excel</button><button className="ghost-btn" onClick={onPrint}><Printer size={16} /> Print</button></div></div>;
}

function SearchBox({ value, onChange, placeholder = 'Search / filter records', inputProps = {} }) {
  return <label className="search-box"><Search size={17} /><input {...inputProps} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

function DataTable({ rows, columns, actions, editable, onAdd }) {
  const [sort, setSort] = useState({ key: columns[0], dir: 'asc' });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  useEffect(() => setPage(1), [rows.length, columns.join('|')]);
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      const result = !Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)
        ? leftNumber - rightNumber
        : String(left ?? '').localeCompare(String(right ?? ''));
      return sort.dir === 'asc' ? result : -result;
    });
    return copy;
  }, [rows, sort]);
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, total);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  function toggleSort(column) {
    setSort((current) => current.key === column ? { key: column, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key: column, dir: 'asc' });
  }
  return <div className="data-table"><div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}><button className="sort-head" onClick={() => toggleSort(column)}>{headerLabel(column)}<span>{sort.key === column ? (sort.dir === 'asc' ? '^' : 'v') : '-'}</span></button></th>)}{actions && <th className="actions-head">Actions</th>}</tr></thead><tbody>{pageRows.length ? pageRows.map((row, index) => <tr key={row.uuid || index}>{columns.map((column) => <td key={column} title={String(displayCellValue(row, column) ?? '')}>{editable && ['quantity', 'price'].includes(column) ? <input className="cell-input" type="number" value={row[column]} onChange={(e) => editable(row, column, e.target.value)} /> : editable && column === 'selected_unit' && row.packaging_options?.length ? <select className="cell-input" value={row.selected_unit_key || row.packaging_options[0].key} onChange={(e) => editable(row, column, e.target.value)}>{row.packaging_options.map((unit) => <option key={unit.key} value={unit.key}>{unit.unit || unit.label}</option>)}</select> : format(row[column], column, row)}</td>)}{actions && <td className="actions-cell"><div className="row-actions">{actions(row)}</div></td>}</tr>) : <tr><td colSpan={columns.length + (actions ? 1 : 0)}><EmptyRows onAdd={onAdd} /></td></tr>}</tbody></table></div><div className="table-footer"><span>Showing {start}-{end} of {total} records</span><div className="pagination"><button className="ghost-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Previous</button><span>Page {safePage} / {pages}</span><button className="ghost-btn" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>Next</button></div></div></div>;
}

function List({ title, rows, cols }) {
  return <section className="panel"><h2>{title}</h2><DataTable rows={rows} columns={cols} /></section>;
}

function RecordModal({ title, fields, record, onSubmit, onClose, context = {} }) {
  const [form, setForm] = useState(record);
  function change(key, value) { setForm({ ...form, [key]: value }); }
  const label = MODULE_LABELS[title] || title.replace(/Management|System/g, '').trim();
  const assistantOptions = assistantOptionsForPatient(context);
  const medicineOptions = medicineOptionsForPatient(context);
  const userRoleOptions = roleOptionsForUserForm(context);
  const scopedBusinessType = context.brand?.business_type || 'General Store';
  return <ModalShell onClose={onClose}><form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}><div className="modal-header"><h2>{record.uuid ? `Edit ${label}` : `Add ${label}`}</h2><button type="button" className="icon-btn" onClick={onClose} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="form-grid">{fields.map(([key, fieldLabel, type = 'text', required = false, options]) => {
    if (title === 'User Management' && key === 'role') {
      return <label key={key}>{fieldLabel}<select required={required} value={form[key] || userRoleOptions[0]} onChange={(e) => change(key, e.target.value)}>{userRoleOptions.map((option) => <option key={option}>{option}</option>)}</select></label>;
    }
    if (title === 'Patient Management' && key === 'assistant_name') {
      return <label key={key}>{fieldLabel}<select value={form[key] || ''} onChange={(e) => change(key, e.target.value)}><option value="">Select assistant / compounder</option>{assistantOptions.map((option) => <option key={option}>{option}</option>)}</select></label>;
    }
    if (title === 'Master Catalog' && key === 'business_type') {
      return <label key={key}>{fieldLabel}<input readOnly value={scopedBusinessType} /></label>;
    }
    if (title === 'Patient Management' && key === 'medicine') {
      const listId = `medicine-options-${record.uuid || 'new'}`;
      return <label key={key}>{fieldLabel}<input required={required} list={listId} value={form[key] || ''} onChange={(e) => change(key, e.target.value)} placeholder="Medicine name likhein..." /><datalist id={listId}>{medicineOptions.map((option) => <option key={option} value={option} />)}</datalist></label>;
    }
    if (title === 'Patient Management' && type === 'prescription') {
      return <PrescriptionEditor key={key} value={form[key]} medicines={medicineOptions} onChange={(value) => change(key, value)} />;
    }
    if (title === 'Patient Management' && type === 'orders') {
      return <DoctorOrdersEditor key={key} value={form[key]} onChange={(value) => change(key, value)} />;
    }
    return <label key={key}>{fieldLabel}{type === 'select' ? <select required={required} value={form[key] || ''} onChange={(e) => change(key, e.target.value)}><option value="">Select</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={required} type={type} value={form[key] || ''} onChange={(e) => change(key, e.target.value)} />}</label>;
  })}</div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={onClose}>Cancel</button><button className="primary-btn">Save</button></div></form></ModalShell>;
}

function DetailModal({ title, row, columns, onClose }) {
  return <ModalShell onClose={onClose}><div className="modal-header"><h2>{title}</h2><button type="button" className="icon-btn" onClick={onClose} title="Close"><X size={17} /></button></div><div className="modal-body"><div className="detail-grid">{columns.map((column) => <div key={column} className="detail-item"><span>{headerLabel(column)}</span><strong>{format(row[column], column)}</strong></div>)}</div></div><div className="modal-footer"><button type="button" className="ghost-btn" onClick={onClose}>Cancel</button><button type="button" className="primary-btn" onClick={() => printTable(title, [row], columns)}><Printer size={15} /> Print</button></div></ModalShell>;
}

function PrescriptionEditor({ value, medicines, onChange }) {
  const rows = useMemo(() => parseEditorJson(value, [{ medicine: '', morning: 1, afternoon: 0, evening: 1, night: 0, days: 5 }]), [value]);
  const update = (index, key, next) => {
    const copy = rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: next } : row);
    onChange(JSON.stringify(copy));
  };
  const add = () => onChange(JSON.stringify([...rows, { medicine: '', morning: 1, afternoon: 0, evening: 0, night: 1, days: 5 }]));
  const remove = (index) => onChange(JSON.stringify(rows.filter((_, rowIndex) => rowIndex !== index)));
  const doseFields = [
    ['morning', 'Morning'],
    ['afternoon', 'Afternoon'],
    ['evening', 'Evening'],
    ['night', 'Night'],
    ['days', 'Days'],
  ];
  return <div className="form-wide rx-editor"><div className="rx-title"><strong>Smart Prescription</strong><span>Medicine dose schedule</span></div><div className="rx-list">{rows.map((row, index) => <div className="rx-row" key={index}><label className="rx-medicine">Medicine<input list="rx-medicines" value={row.medicine || ''} onChange={(e) => update(index, 'medicine', e.target.value)} placeholder="Medicine name" /></label>{doseFields.map(([key, label]) => <label key={key}>{label}<input type="number" min={key === 'days' ? '1' : '0'} value={row[key] || (key === 'days' ? 1 : 0)} onChange={(e) => update(index, key, Number(e.target.value))} /></label>)}<button type="button" className="danger-btn rx-remove" onClick={() => remove(index)} title="Remove medicine"><Trash2 size={14} /></button></div>)}</div><datalist id="rx-medicines">{medicines.map((medicine) => <option key={medicine} value={medicine} />)}</datalist><button type="button" className="ghost-btn" onClick={add}><Plus size={15} /> Add Medicine</button></div>;
}

function DoctorOrdersEditor({ value, onChange }) {
  const defaults = ['Injection', 'IV Drip', 'Nebulization', 'Dressing', 'ECG', 'CBC', 'LFT', 'RFT', 'Blood Sugar', 'Urine Test', 'X-Ray', 'Ultrasound', 'CT Scan', 'MRI', 'Admission'];
  const rows = parseEditorJson(value, []);
  const toggle = (name) => {
    const exists = rows.some((row) => row.name === name);
    const next = exists ? rows.filter((row) => row.name !== name) : [...rows, { name, order_name: name, charges: 0 }];
    onChange(JSON.stringify(next));
  };
  return <div className="form-wide"><strong>Doctor Orders</strong><div className="chips">{defaults.map((name) => <button type="button" key={name} className={rows.some((row) => row.name === name) ? 'tab active' : 'tab'} onClick={() => toggle(name)}>{name}</button>)}</div></div>;
}

function HospitalWorkflow({ title, rows, store, columns, refresh }) {
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => filterRows(rows, query, columns), [rows, query, columns]);
  async function submit(record) {
    if (store === 'hospital_prescriptions' && record.status === 'Completed') {
      await completeHospitalPrescription(record.uuid);
    } else if (store === 'lab_reports' && record.status === 'Completed') {
      await completeHospitalLabReport(record.uuid, record);
    } else if (store === 'radiology_reports' && record.status === 'Completed') {
      await completeHospitalRadiologyReport(record.uuid, record);
    } else if (['lab_reports', 'radiology_reports'].includes(store) && ['Reviewed', 'Need Repeat', 'Need Follow Up'].includes(record.doctor_review_status)) {
      await reviewHospitalReport(store, record.uuid, record.doctor_review_status);
    } else {
      const saved = await saveRecord(store, record);
      runInBackground(() => saveRemoteRecord(store, saved), `${title} synced in background`);
    }
    setEditing(null);
    await refresh();
    notify(`${title} saved successfully`);
  }
  async function remove(row, mode) {
    await deleteEverywhere(store, row, mode);
    setDeleting(null);
    await refresh();
    notify(`${title} deleted successfully`);
  }
  const workflowFields = hospitalWorkflowFields(store);
  const openComplete = (row) => setEditing({ ...row, status: row.status === 'Completed' || row.status === 'Reviewed' ? row.status : 'Completed' });
  return <div className="stack"><section className="panel"><ModuleHeader title={title} query={query} setQuery={setQuery} onAdd={null} onExport={() => exportCsv(`${store}.csv`, filtered)} onPrint={() => printTable(title, filtered, columns)} /><DataTable rows={filtered} columns={columns} actions={(row) => <><button className="ghost-btn" onClick={() => setViewing(row)}>View</button><button className="ghost-btn" onClick={() => openComplete(row)}><Edit3 size={15} /> Complete / Review</button><button className="danger-btn" onClick={() => setDeleting(row)}><Trash2 size={15} /> Delete</button></>} /></section>{viewing && <DetailModal title={`${title} Detail`} row={viewing} columns={columns} onClose={() => setViewing(null)} />}{editing && <RecordModal title={title} fields={workflowFields} record={editing} onClose={() => setEditing(null)} onSubmit={submit} />}{deleting && <DeleteDialog row={deleting} store={store} onClose={() => setDeleting(null)} onDelete={(mode) => remove(deleting, mode)} />}</div>;
}

function hospitalWorkflowFields(store) {
  if (store === 'lab_reports') {
    return [
      ['status', 'Status', 'select', true, ['Pending', 'In Progress', 'Completed', 'Reviewed', 'Need Repeat']],
      ['result', 'Result'],
      ['remarks', 'Remarks'],
      ['technician_name', 'Technician Name'],
      ['attachment_url', 'Attachment URL'],
      ['doctor_review_status', 'Doctor Review', 'select', false, ['', 'Pending Review', 'Reviewed', 'Need Repeat', 'Need Follow Up']],
    ];
  }
  if (store === 'radiology_reports') {
    return [
      ['status', 'Status', 'select', true, ['Pending', 'Completed', 'Reviewed', 'Need Repeat']],
      ['findings', 'Findings'],
      ['impression', 'Impression'],
      ['report_text', 'Report Text'],
      ['radiologist_name', 'Radiologist Name'],
      ['attachment_url', 'Attachment URL'],
      ['doctor_review_status', 'Doctor Review', 'select', false, ['', 'Pending Review', 'Reviewed', 'Need Repeat', 'Need Follow Up']],
    ];
  }
  return [['status', 'Status', 'select', true, ['Pending', 'In Progress', 'Completed', 'Cancelled']], ['notes', 'Notes']];
}

function HospitalBillingWorkflow({ data, brand, refresh }) {
  const [query, setQuery] = useState('');
  const [tokenQuery, setTokenQuery] = useState('');
  const [selectedUuid, setSelectedUuid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidDraft, setPaidDraft] = useState('');
  const patients = data.patients || [];
  const patientMap = new Map(patients.map((patient) => [patient.uuid, patient]));
  const actualBills = data.hospital_bills || [];
  const billedPatients = new Set(actualBills.map((bill) => bill.patient_uuid));
  const virtualBills = patients
    .filter((patient) => !billedPatients.has(patient.uuid))
    .filter((patient) => ['Waiting', 'Doctor Checked', 'Sent To Reception', 'Under Treatment', 'Treatment Completed'].includes(patient.status))
    .map((patient) => hospitalVirtualBill(patient, data));
  const bills = [...actualBills, ...virtualBills].map((bill) => {
    const patient = patientMap.get(bill.patient_uuid);
    return { ...bill, token_number: bill.token_number || patient?.token_number || '', diagnosis: patient?.diagnosis || '', instructions: patient?.clinical_notes || patient?.notes || '', patient_status: patient?.status || '' };
  });
  const billItems = data.hospital_bill_items || [];
  const tasks = hospitalServiceTasks(data);
  const filteredBills = useMemo(() => filterRows(bills, query, ['token_number', 'bill_number', 'patient_name', 'doctor_name', 'diagnosis', 'status', 'patient_status']), [bills, query]);
  const activeBill = bills.find((bill) => bill.uuid === selectedUuid) || filteredBills[0] || null;
  const lines = useMemo(() => activeBill ? hospitalBillLines(activeBill, billItems, tasks, data) : [], [activeBill, billItems, tasks, data]);
  const activePatient = activeBill ? patientMap.get(activeBill.patient_uuid) : null;
  const total = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const paid = Number(activeBill?.paid || 0);
  const balance = Math.max(0, total - paid);

  useEffect(() => {
    if (!selectedUuid && filteredBills[0]) setSelectedUuid(filteredBills[0].uuid);
  }, [filteredBills.length, selectedUuid]);

  useEffect(() => {
    const value = tokenQuery.trim().toLowerCase();
    if (!value) return;
    const match = bills.find((bill) => String(bill.token_number || '').toLowerCase() === value);
    if (match) setSelectedUuid(match.uuid);
  }, [tokenQuery, bills]);

  useEffect(() => {
    if (activeBill) setPaidDraft(String(activeBill.paid || total || 0));
  }, [activeBill?.uuid, total]);

  async function updatePatientStatus(status) {
    if (!activePatient) return;
    const order = ['Waiting', 'Doctor Checked', 'Sent To Reception', 'Under Treatment', 'Treatment Completed', 'Closed'];
    let current = activePatient.status || 'Waiting';
    const targetIndex = order.indexOf(status);
    let currentIndex = order.indexOf(current);
    if (targetIndex < 0 || currentIndex < 0 || targetIndex < currentIndex) return;
    while (currentIndex < targetIndex) {
      current = order[currentIndex + 1];
      await transitionHospitalPatientStatus(activePatient.uuid, current);
      currentIndex += 1;
    }
  }

  async function updateLine(line, patch) {
    if (activeBill?.is_virtual) {
      const effectiveLines = lines.map((item) => item.uuid === line.uuid ? { ...item, amount: patch.amount ?? item.amount, status: patch.status ?? item.status } : item);
      await materializeHospitalBill(activeBill, effectiveLines);
      if (line.task && patch.status) {
        const updatedTask = await saveRecord(line.task.store, { ...line.task.raw, status: patch.status });
        runInBackground(() => saveRemoteRecord(line.task.store, updatedTask), 'Hospital service synced in background');
      }
      await refresh();
      return;
    }
    const realBill = activeBill;
    if (line.source === 'item') {
      const updated = await saveRecord('hospital_bill_items', { ...line.raw, bill_uuid: realBill.uuid, amount: patch.amount ?? line.amount });
      runInBackground(() => saveRemoteRecord('hospital_bill_items', updated), 'Bill item synced in background');
    }
    if (line.task) {
      const updatedTask = await saveRecord(line.task.store, { ...line.task.raw, status: patch.status ?? line.status });
      runInBackground(() => saveRemoteRecord(line.task.store, updatedTask), 'Hospital service synced in background');
    }
    if ((patch.status || '').includes('Progress')) await updatePatientStatus('Under Treatment');
    if (patch.status === 'Completed' && lines.every((item) => item.uuid === line.uuid || !item.task || item.status === 'Completed')) {
      await updatePatientStatus('Treatment Completed');
    }
    await refresh();
  }

  async function saveBill(extra = {}) {
    if (!activeBill) return;
    const realBill = activeBill.is_virtual ? await materializeHospitalBill(activeBill, lines) : activeBill;
    const nextPaid = Number(extra.paid ?? (paidDraft || total));
    await saveHospitalBillPayment(realBill.uuid, { paid_amount: nextPaid, payment_method: paymentMethod });
    await refresh();
    notify('Payment received. Patient case closed.');
  }

  async function completeAll() {
    for (const line of lines) {
      if (line.task) {
        const updatedTask = await saveRecord(line.task.store, { ...line.task.raw, status: 'Completed' });
        runInBackground(() => saveRemoteRecord(line.task.store, updatedTask), 'Hospital service synced in background');
      }
    }
    await updatePatientStatus('Treatment Completed');
    await saveBill();
    notify(`${activeBill?.token_number || 'Token'} marked treated`);
  }

  async function closeCase() {
    await updatePatientStatus('Closed');
    await refresh();
    notify(`${activeBill?.token_number || 'Token'} closed`);
  }

  if (!activeBill) {
    return <section className="panel"><ModuleHeader title="Hospital Billing" query={query} setQuery={setQuery} onAdd={null} onExport={() => exportCsv('hospital-bills.csv', filteredBills)} onPrint={() => printTable('Hospital Billing', filteredBills, ['token_number', 'bill_number', 'patient_name', 'grand_total', 'paid', 'balance', 'status'])} /><DashboardEmpty icon={Calculator} title="No Pending Bills" description="Doctor recommendations and patient bills will appear here automatically." /></section>;
  }

  return <div className="billing-workflow"><section className="panel"><ModuleHeader title="Hospital Billing" query={query} setQuery={setQuery} onAdd={null} onExport={() => exportCsv('hospital-bills.csv', filteredBills)} onPrint={() => printHospitalBill(activeBill, lines, brand)} /><div className="token-search"><label>Search Token<input value={tokenQuery} onChange={(e) => setTokenQuery(e.target.value)} placeholder="H-260604-0001" /></label><span>{activeBill.token_number || 'No token selected'}</span></div><DataTable rows={filteredBills} columns={['token_number', 'bill_number', 'patient_name', 'patient_status', 'grand_total', 'paid', 'balance', 'status']} actions={(row) => <button className="ghost-btn" onClick={() => setSelectedUuid(row.uuid)}>Open</button>} /></section><section className="panel billing-panel"><div className="module-head"><div><h2>{activeBill.token_number} - {activeBill.patient_name}</h2><p className="muted">{activeBill.bill_number} - {activePatient?.doctor_name || 'Doctor'} recommendations, completion and final bill.</p></div><div className="module-actions"><button className="ghost-btn" onClick={completeAll}>Mark Treated</button><button className="ghost-btn" onClick={closeCase}>Close Case</button><button className="ghost-btn" onClick={() => printHospitalBill(activeBill, lines, brand)}><Printer size={16} /> Print Bill</button><button className="ghost-btn" onClick={() => downloadPdf(`${activeBill.bill_number || 'hospital-bill'}.pdf`, 'Hospital Bill', hospitalBillPdfLines(activeBill, lines, brand))}><FileDown size={16} /> PDF Bill</button><button className="primary-btn" onClick={() => saveBill()}>Save Bill</button></div></div><div className="patient-summary"><div><span>Diagnosis</span><strong>{activePatient?.diagnosis || 'No diagnosis'}</strong></div><div><span>Instructions</span><strong>{activePatient?.clinical_notes || activePatient?.notes || 'No instructions'}</strong></div><div><span>Doctor</span><strong>{activePatient?.doctor_name || '-'}</strong></div><div><span>Status</span><strong>{activePatient?.status || activeBill.patient_status || '-'}</strong></div></div><div className="billing-lines">{lines.map((line) => <div className="billing-line" key={line.uuid}><label className="billing-check"><span>{line.task ? 'Task' : 'Added'}</span>{line.task ? <select value={line.status} onChange={(e) => updateLine(line, { status: e.target.value })}><option>Pending</option><option>In Progress</option><option>Completed</option></select> : <strong>Added</strong>}</label><div><strong>{line.description}</strong><small>{line.item_type}</small></div><input type="number" min="0" defaultValue={line.amount || 0} onBlur={(e) => updateLine(line, { amount: Number(e.target.value) })} /></div>)}</div><div className="totals billing-total"><span>Total <strong>{money(total)}</strong></span><label>Paid<input type="number" min="0" value={paidDraft} onChange={(e) => setPaidDraft(e.target.value)} /></label><label>Method<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>Cash</option><option>EasyPaisa</option><option>JazzCash</option><option>Card</option><option>Bank Transfer</option></select></label><span>Balance <strong>{money(Math.max(0, total - Number(paidDraft || 0)))}</strong></span></div></section></div>;
}

function hospitalServiceTasks(data) {
  return [
    ...(data.hospital_tasks || []).map((row) => ({ store: 'hospital_tasks', raw: row, patient_uuid: row.patient_uuid, token_number: row.token_number, name: row.task_name, type: row.task_type, status: row.status })),
    ...(data.lab_reports || []).map((row) => ({ store: 'lab_reports', raw: row, patient_uuid: row.patient_uuid, token_number: row.token_number, name: row.test_name, type: 'Lab', status: row.status })),
    ...(data.radiology_reports || []).map((row) => ({ store: 'radiology_reports', raw: row, patient_uuid: row.patient_uuid, token_number: row.token_number, name: row.study_type, type: 'Radiology', status: row.status })),
  ];
}

function hospitalVirtualBill(patient, data) {
  const lines = hospitalVirtualLines(patient, data);
  const totals = hospitalBillTotals(lines, 0);
  return {
    uuid: `virtual-${patient.uuid}`,
    is_virtual: true,
    patient_uuid: patient.uuid,
    token_number: patient.token_number,
    bill_number: `HBL-${patient.token_number || patient.mr_number || patient.uuid.slice(0, 6)}`,
    patient_name: patient.patient_name,
    paid: 0,
    status: 'Pending',
    ...totals,
  };
}

function hospitalBillLines(bill, billItems, tasks, data = {}) {
  if (bill.is_virtual) {
    const patient = (data.patients || []).find((row) => row.uuid === bill.patient_uuid);
    return patient ? hospitalVirtualLines(patient, data) : [];
  }
  return billItems
    .filter((item) => item.bill_uuid === bill.uuid)
    .map((item) => {
      const task = tasks.find((row) => row.patient_uuid === item.patient_uuid && String(row.name || '').toLowerCase() === String(item.description || '').toLowerCase());
      return {
        uuid: item.uuid,
        source: 'item',
        raw: item,
        task,
        item_type: item.item_type,
        description: item.description,
        amount: Number(item.amount || 0),
        status: task?.status || 'Added',
      };
    });
}

function hospitalVirtualLines(patient, data = {}) {
  const rows = [];
  const fee = Number(patient.registration_fee || patient.fee || 0);
  if (fee > 0) rows.push({ uuid: `fee-${patient.uuid}`, source: 'item', item_type: 'Doctor Fee', description: 'Consultation / Registration Fee', amount: fee, status: 'Added', raw: { patient_uuid: patient.uuid, token_number: patient.token_number, item_type: 'Doctor Fee', description: 'Consultation / Registration Fee', quantity: 1, amount: fee } });
  for (const item of (data.hospital_prescriptions || []).filter((row) => row.patient_uuid === patient.uuid)) {
    rows.push({ uuid: item.uuid, source: 'item', item_type: 'Medicine', description: item.medicine_name, amount: Number(item.amount || 0), status: 'Added', raw: { patient_uuid: patient.uuid, token_number: patient.token_number, item_type: 'Medicine', description: item.medicine_name, quantity: 1, amount: Number(item.amount || 0) } });
  }
  const tasks = hospitalServiceTasks(data).filter((row) => row.patient_uuid === patient.uuid);
  for (const order of (data.hospital_orders || []).filter((row) => row.patient_uuid === patient.uuid)) {
    const task = tasks.find((row) => String(row.name || '').toLowerCase() === String(order.order_name || '').toLowerCase());
    rows.push({ uuid: order.uuid, source: 'item', task, item_type: order.order_type, description: order.order_name, amount: Number(order.charges || 0), status: task?.status || 'Pending', raw: { patient_uuid: patient.uuid, token_number: patient.token_number, item_type: order.order_type, description: order.order_name, quantity: 1, amount: Number(order.charges || 0) } });
  }
  return rows;
}

async function materializeHospitalBill(bill, lines = []) {
  if (!bill?.is_virtual) return bill;
  const totals = hospitalBillTotals(lines, Number(bill.paid || 0));
  const saved = await saveRecord('hospital_bills', {
    patient_uuid: bill.patient_uuid,
    token_number: bill.token_number,
    bill_number: bill.bill_number,
    patient_name: bill.patient_name,
    paid: Number(bill.paid || 0),
    status: bill.status || 'Pending',
    ...totals,
  });
  await saveRemoteRecord('hospital_bills', saved);
  for (const line of lines.filter((item) => item.source === 'item')) {
    const savedItem = await saveRecord('hospital_bill_items', { ...line.raw, bill_uuid: saved.uuid, patient_uuid: bill.patient_uuid, token_number: bill.token_number, amount: Number(line.amount || 0) });
    await saveRemoteRecord('hospital_bill_items', savedItem);
  }
  return saved;
}

function hospitalBillTotals(lines, paid = 0) {
  const byType = (type) => lines.filter((line) => line.item_type === type).reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const grandTotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  return {
    doctor_fee: byType('Doctor Fee'),
    medicine_charges: byType('Medicine'),
    injection_charges: byType('Injection'),
    lab_charges: byType('Lab'),
    radiology_charges: byType('Radiology'),
    procedure_charges: lines.filter((line) => !['Doctor Fee', 'Medicine', 'Injection', 'Lab', 'Radiology'].includes(line.item_type)).reduce((sum, line) => sum + Number(line.amount || 0), 0),
    grand_total: grandTotal,
    balance: Math.max(0, grandTotal - Number(paid || 0)),
  };
}

function parseEditorJson(value, fallback) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function EmptyRows({ onAdd }) {
  return <div className="empty-inline"><strong>No records found</strong>{onAdd && <button className="primary-btn" type="button" onClick={onAdd}><Plus size={16} /> Add New Record</button>}</div>;
}

function Pagination({ page, total, setPage }) {
  const pages = Math.max(1, Math.ceil(total / 10));
  return <div className="pagination"><button className="ghost-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} / {pages}</span><button className="ghost-btn" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>;
}

function filterRows(rows, query, keys) {
  const value = query.trim().toLowerCase();
  if (!value) return rows;
  return rows.filter((row) => keys.some((key) => String(row[key] || '').toLowerCase().includes(value)));
}

function usersForRole(rows, auth = {}) {
  if (auth.role !== 'Super Admin') return rows;
  return rows.filter((row) => userRole(row) === 'Super Admin');
}

function medicineFormPayload(record = {}) {
  const boolValue = (value, fallback = true) => {
    if (value === 'Yes') return true;
    if (value === 'No') return false;
    if (value === undefined || value === null || value === '') return fallback;
    return Boolean(value);
  };
  return {
    ...record,
    batch_tracking: boolValue(record.batch_tracking, true),
    expiry_tracking: boolValue(record.expiry_tracking, true),
    purchase_price: Number(record.purchase_price || 0),
    sale_price: Number(record.sale_price || 0),
    mrp: Number(record.mrp || 0),
    tax_percentage: Number(record.tax_percentage || 0),
    reorder_level: Number(record.reorder_level || 0),
    status: record.status || 'Active',
  };
}

async function addMedicineToInventory(medicine) {
  const product = {
    product_name: medicine.brand_name,
    category: 'Medicine',
    brand: medicine.manufacturer || medicine.generic_name || '',
    sku: medicine.registration_no || '',
    barcode: medicine.barcode || '',
    unit: medicine.pack_size || 'pcs',
    batch_number: '',
    expiry_date: '',
    manufacturer: medicine.manufacturer || '',
    purchase_price: medicine.purchase_price || 0,
    sale_price: medicine.sale_price || medicine.mrp || 0,
    quantity: 0,
    low_stock_threshold: medicine.reorder_level || 0,
    medicine_uuid: medicine.uuid,
    warranty: medicine.expiry_tracking ? 'Expiry tracked' : '',
  };
  const saved = await saveRecord('products', product);
  window.dispatchEvent(new CustomEvent('msm:product-saved', { detail: saved }));
  broadcastInventoryRefresh({ action: 'medicine-added-to-inventory', product_uuid: saved.uuid });
  await auditProductHydration(saved);
  notify('Medicine added to inventory');
}

function licenseExpiryForType(type = '1 Month', currentExpiry = '') {
  if (type === 'Lifetime') return 'Lifetime';
  const months = { '1 Month': 1, '6 Months': 6, '1 Year': 12 }[type] || 1;
  const current = currentExpiry && currentExpiry !== 'Lifetime' ? new Date(currentExpiry) : null;
  const expiry = current && current.getTime() > Date.now() ? current : new Date();
  expiry.setMonth(expiry.getMonth() + months);
  return expiry.toISOString().slice(0, 10);
}

function licenseDaysLeft(license = {}) {
  if (!license.expiry_date || license.expiry_date === 'Lifetime') return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(license.expiry_date);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function licensePayload(license = {}) {
  const sale = Number(license.sale_price ?? license.metadata?.sale_price ?? 0);
  const cost = Number(license.cost_price ?? license.metadata?.cost_price ?? 0);
  const metadata = {
    ...(license.metadata || {}),
    sale_price: sale,
    cost_price: cost,
    profit: Math.max(0, sale - cost),
    theme_color: license.theme_color || license.metadata?.theme_color || '#14B8A6',
    logo: license.logo || license.metadata?.logo || '',
    footer_branding: license.footer_branding || license.metadata?.footer_branding || '',
  };
  const { days_left, renewal_state, renewal_type, ...clean } = license;
  return {
    ...clean,
    sale_price: sale,
    cost_price: cost,
    profit: metadata.profit,
    theme_color: metadata.theme_color,
    logo: metadata.logo,
    footer_branding: metadata.footer_branding,
    metadata,
  };
}

function enrichLicense(license = {}) {
  const days = licenseDaysLeft(license);
  const metadata = license.metadata || {};
  const sale = Number(license.sale_price ?? metadata.sale_price ?? 0);
  const cost = Number(license.cost_price ?? metadata.cost_price ?? 0);
  const renewalState = license.expiry_date === 'Lifetime'
    ? 'Lifetime'
    : days < 0
      ? 'Expired'
      : days <= 30
        ? 'Renew Soon'
        : 'Active';
  return {
    ...license,
    sale_price: sale,
    cost_price: cost,
    profit: Number(license.profit ?? metadata.profit ?? Math.max(0, sale - cost)),
    theme_color: license.theme_color || metadata.theme_color || '#14B8A6',
    logo: license.logo || metadata.logo || '',
    footer_branding: license.footer_branding || metadata.footer_branding || '',
    days_left: license.expiry_date === 'Lifetime' ? 'Lifetime' : `${Math.max(days ?? 0, 0)} days`,
    renewal_state: renewalState,
  };
}

function assistantOptionsForPatient(context = {}) {
  const doctor = currentDoctorName(context.auth, context.brand).toLowerCase();
  return [...new Set((context.assistants || [])
    .filter((assistant) => !doctor || !assistant.doctor_name || String(assistant.doctor_name).toLowerCase() === doctor)
    .filter((assistant) => assistant.status !== 'Disabled')
    .map((assistant) => assistant.name)
    .filter(Boolean))]
    .sort();
}

function roleOptionsForUserForm(context = {}) {
  if (context.auth?.role === 'Super Admin') return ['Super Admin', 'Admin', 'Manager', 'Cashier', 'Technician', 'Hospital Owner', 'Receptionist', 'Doctor', 'Compounder', 'Assistant', 'Nurse', 'Pharmacy Staff', 'Lab Technician', 'X-Ray Technician', 'Billing Officer'];
  if (context.brand?.business_type === 'Hospital') return ['Hospital Owner', 'Admin', 'Receptionist', 'Doctor', 'Compounder', 'Assistant', 'Nurse', 'Pharmacy Staff', 'Lab Technician', 'X-Ray Technician', 'Billing Officer', 'Manager'];
  if (context.brand?.business_type === 'Mobile Shop') return ['Manager', 'Cashier', 'Technician'];
  return ['Manager', 'Cashier'];
}

function medicineOptionsForPatient(context = {}) {
  const master = (context.medicines || [])
    .map((row) => [row.brand_name, row.generic_name, row.strength].filter(Boolean).join(' '))
    .filter(Boolean);
  const catalogs = catalogRowsForBusiness(context.catalogs || [], { business_type: 'Hospital' })
    .filter((row) => ['medicine', 'healthcare', 'pharmacy', 'tablet', 'capsule', 'syrup', 'injection'].some((word) => `${row.category || ''} ${row.type || ''}`.toLowerCase().includes(word)))
    .map((row) => row.name)
    .filter(Boolean);
  const fallback = [...(CATALOG_PRESETS.Hospital || []), ...(CATALOG_PRESETS.Pharmacy || [])].map(([name]) => name);
  return [...new Set([...master, ...catalogs, ...fallback])].sort().slice(0, 60000);
}

function catalogRowsForBusiness(rows, brand) {
  const type = brand?.business_type || 'General Store';
  const allowed = new Set([type, 'All']);
  if (type === 'General Store') allowed.add('Grocery Store');
  if (type === 'Grocery Store') allowed.add('General Store');
  if (type === 'Hospital') allowed.add('Pharmacy');
  return rows
    .filter((row) => allowed.has(row.business_type || 'All'))
    .map((row) => ({ ...row, product_name: row.product_name || row.name, name: row.name || row.product_name }));
}

function backupStoresForBusiness(role, businessType = 'General Store') {
  if (role === 'Super Admin') return [
    'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
    'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
    'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
    'roles', 'permissions', 'settings', 'notifications', 'inventory_transactions',
    'manual_repair_receipts', 'mobile_wallet_transactions', 'patients', 'assistants',
    'hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports',
    'radiology_reports', 'hospital_bills', 'hospital_bill_items',
    'master_catalogs', 'medicines', 'licenses', 'audit_logs', 'sync_queue',
  ];
  if (businessType === 'Hospital') return [
    'patients', 'assistants', 'hospital_prescriptions', 'hospital_orders', 'hospital_tasks',
    'lab_reports', 'radiology_reports', 'hospital_bills', 'hospital_bill_items', 'expenses', 'payments', 'cashbook',
    'settings', 'notifications', 'master_catalogs', 'medicines', 'sync_queue',
  ];
  if (businessTypeKey(businessType) === 'traders') return [
    'products', 'suppliers', 'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
    'expenses', 'payments', 'cashbook', 'users', 'settings', 'notifications', 'inventory_transactions',
    'master_catalogs', 'trader_companies', 'trader_brands', 'trader_territories', 'trader_routes',
    'trader_salesmen', 'trader_retailers', 'trader_delivery_challans', 'trader_recoveries',
    'trader_salesman_ledgers', 'trader_distributor_ledgers', 'sync_queue',
  ];
  const stores = [
    'products', 'categories', 'brands', 'customers', 'customer_ledgers', 'suppliers',
    'supplier_ledgers', 'sales', 'sale_items', 'purchases', 'purchase_items',
    'expenses', 'repairs', 'repair_updates', 'payments', 'cashbook', 'users',
    'settings', 'notifications', 'inventory_transactions',
    'manual_repair_receipts', 'mobile_wallet_transactions', 'patients', 'assistants',
    'hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports',
    'radiology_reports', 'hospital_bills', 'hospital_bill_items',
    'master_catalogs', 'medicines', 'sync_queue',
  ];
  if (businessType !== 'Mobile Shop') {
    return stores.filter((store) => !['mobile_wallet_transactions', 'repairs', 'repair_updates', 'manual_repair_receipts', 'patients', 'assistants', 'hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports', 'radiology_reports', 'hospital_bills', 'hospital_bill_items'].includes(store));
  }
  return stores.filter((store) => !['patients', 'assistants', 'hospital_prescriptions', 'hospital_orders', 'hospital_tasks', 'lab_reports', 'radiology_reports', 'hospital_bills', 'hospital_bill_items'].includes(store));
}

function downloadCatalogTemplate() {
  exportCsv('master-catalog-template.csv', [
    { product_name: 'Paracetamol 500mg', name: 'Paracetamol 500mg', business_type: 'Pharmacy', category: 'Medicine', subcategory: 'Tablet', brand: 'Generic', barcode: '', pack_size: '10 tablets', unit: 'Pack', default_cost: 0, default_price: 0, notes: 'Sample row' },
    { product_name: 'iPhone 15 Pro Max', name: 'iPhone 15 Pro Max', business_type: 'Mobile Shop', category: 'Mobile Phones', subcategory: 'Model', brand: 'Apple', barcode: '', pack_size: 'Single', unit: 'Single Unit', default_cost: 0, default_price: 0, notes: 'Sample row' },
    { product_name: 'Coca Cola', name: 'Coca Cola', business_type: 'General Store', category: 'Beverages', subcategory: 'Soft Drink', brand: 'Coca Cola', barcode: '', pack_size: '500ml', unit: 'Single Unit', default_cost: 0, default_price: 0, notes: 'Sample row' },
  ]);
}

function money(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function displayCellValue(row = {}, key) {
  if (key === 'selected_unit') return row.selected_unit;
  if (key === 'unit_conversion') return lineConversionLabel(row);
  if (key === 'line_total') return lineTotal(row);
  return key === 'product_name' ? productDisplayName(row) : row[key];
}

function format(value, key, row = {}) {
  if (key === 'product_name') return saleLineDisplayName(row);
  if (key === 'selected_unit') return row.selected_unit || value || '';
  if (key === 'unit_conversion') return lineConversionLabel(row);
  if (key === 'line_total') return money(lineTotal(row));
  if (key === 'imei_numbers') return imeiListText({ imei_numbers: value });
  if (key === 'status') return <span className={`status-tag ${statusClass(value)}`}>{String(value ?? '')}</span>;
  if (['purchase_price', 'sale_price', 'cost_price', 'unit_cost_price', 'unit_sale_price', 'package_cost_price', 'total_cost', 'amount', 'fee', 'net_amount', 'salary', 'charges', 'repair_charges', 'advance_payment', 'remaining_amount', 'registration_fee', 'doctor_fee', 'medicine_charges', 'injection_charges', 'lab_charges', 'radiology_charges', 'procedure_charges', 'grand_total', 'subtotal', 'discount', 'tax', 'total', 'paid', 'balance', 'profit', 'debit', 'credit', 'total_spent', 'available', 'cash_in', 'sent', 'pending', 'fee_profit', 'mrp'].includes(key)) return money(value);
  if (String(key).includes('_at') && value) return new Date(value).toLocaleString();
  if (['visit_date', 'next_visit', 'delivery_date', 'expiry_date', 'due_date'].includes(key) && value) return new Date(value).toLocaleDateString();
  return String(value ?? '');
}

function imeiListText(row = {}) {
  const value = row.imei_numbers || row.imeis || row.imei || row.imei_1 || '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'string') {
    try {
      const decoded = JSON.parse(value);
      if (Array.isArray(decoded)) return decoded.filter(Boolean).join(', ');
    } catch {
      // Plain newline/comma separated IMEI text.
    }
    return value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean).join(', ');
  }
  return String(value || '');
}

function headerLabel(key) {
  return HEADER_LABELS[key] || key.replaceAll('_', ' ');
}

function statusClass(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('out') || text.includes('disabled') || text.includes('due')) return 'bad';
  if (text.includes('low') || text.includes('pending') || text.includes('progress') || text.includes('payable')) return 'warn';
  return 'ok';
}

function printTable(title, rows, columns, brand = window.__msmBrand || {}) {
  const html = `<div class="brand">${shopDisplayName(brand)}</div><h2>${title}</h2><table><thead><tr>${columns.map((col) => `<th>${headerLabel(col)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((col) => `<td>${printableFormat(row[col], col, row)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  printHtml(title, html);
}

function printableFormat(value, key, row = {}) {
  if (key === 'product_name') return saleLineDisplayName(row);
  if (key === 'selected_unit') return row.selected_unit || value || '';
  if (['purchase_price', 'sale_price', 'cost_price', 'unit_cost_price', 'unit_sale_price', 'package_cost_price', 'total_cost', 'amount', 'fee', 'net_amount', 'salary', 'charges', 'repair_charges', 'advance_payment', 'remaining_amount', 'registration_fee', 'doctor_fee', 'medicine_charges', 'injection_charges', 'lab_charges', 'radiology_charges', 'procedure_charges', 'grand_total', 'subtotal', 'discount', 'tax', 'total', 'paid', 'balance', 'profit', 'debit', 'credit', 'total_spent', 'available', 'cash_in', 'sent', 'pending', 'fee_profit', 'mrp'].includes(key)) return money(value);
  if (String(key).includes('_at') && value) return new Date(value).toLocaleString();
  if (['visit_date', 'next_visit', 'delivery_date', 'expiry_date', 'due_date'].includes(key) && value) return new Date(value).toLocaleDateString();
  return String(value ?? '');
}

function legacyPrintInvoice(sale, cart, brand = window.__msmBrand || {}) {
  const html = `<div class="brand">${shopDisplayName(brand)}</div><h2>Invoice ${sale.invoice_number}</h2><p>${sale.customer_name} - ${new Date(sale.sold_at).toLocaleString()}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th></tr></thead><tbody>${cart.map((item) => `<tr><td>${saleLineDisplayName(item)}</td><td>${lineQuantityLabel(item)}</td><td>${money(item.price)}</td></tr>`).join('')}</tbody></table><h3 class="right">Total: ${money(sale.total)}</h3><p>Paid: ${money(sale.paid)} | Balance: ${money(sale.balance)}</p>`;
  printHtml(`Invoice ${sale.invoice_number}`, html);
}

function printBarcode(product) {
  printHtml('Barcode', `<div class="brand">MSM</div><h2>${productDisplayName(product)}</h2><svg id="barcode"></svg><p>${product.barcode || product.sku || product.imei || product.uuid}</p>`);
}

function printLedger(party, ledgers, key = 'customer_uuid') {
  const rows = ledgers.filter((row) => row[key] === party.uuid);
  printTable(`${party.name || party.supplier_name} Ledger`, rows, ['type', 'amount', 'reference', 'due_date', 'entry_at']);
}

function printJobCard(repair) {
  printHtml(`Job Card ${repair.job_number}`, `<div class="brand">DSH Repair Job Card</div><h2>${repair.job_number || repair.uuid}</h2><p>Customer: ${repair.customer_name}</p><p>Device: ${repair.device_name}</p><p>IMEI: ${repair.imei}</p><p>Problem: ${repair.problem}</p><p>Status: ${repair.status}</p><h3>Charges: ${money(repair.charges)}</h3>`);
}

function printPurchaseReceipt(purchase) {
  printHtml(`Purchase ${purchase.invoice_number}`, `<section class="receipt-shell"><div class="brand">Purchase Receipt</div><h2>${purchase.invoice_number}</h2><p>Supplier: ${purchase.supplier_name || ''}</p><p>Status: ${purchase.status || ''}</p><h3>Total: ${money(purchase.total)}</h3><p>Paid: ${money(purchase.paid)} | Balance: ${money(purchase.balance)}</p></section>`);
}

function receiptFormatClass(format = 'a4') {
  if (String(format).includes('58')) return 'thermal thermal-58';
  if (String(format).includes('80') || String(format).toLowerCase() === 'thermal') return 'thermal thermal-80';
  return 'a4-invoice';
}

function paymentDisplay(invoice = {}) {
  const total = Number(invoice.total ?? invoice.grand_total ?? invoice.grandTotal ?? 0);
  const paid = Number(invoice.paid ?? invoice.paid_amount ?? invoice.paidAmount ?? 0);
  const changeReturn = Math.max(0, Number(invoice.change_return ?? invoice.changeReturn ?? paid - total));
  const dueSource = invoice.due_amount ?? invoice.dueAmount ?? (paid < total ? total - paid : invoice.balance ?? 0);
  const dueAmount = Math.max(0, Number(dueSource));
  return {
    total,
    paid,
    changeReturn: dueAmount > 0 ? 0 : changeReturn,
    dueAmount: changeReturn > 0 ? 0 : dueAmount,
    method: formatPaymentMethod(invoice.payment_method || invoice.payment_type || invoice.payment || 'Cash'),
  };
}

function formatPaymentMethod(value = 'Cash') {
  return String(value || 'Cash')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function invoiceWithPaymentMeta(invoice = {}, payment = {}) {
  const total = Number(invoice.total ?? invoice.grand_total ?? 0);
  const paid = Number(invoice.paid ?? payment.paid ?? 0);
  const changeReturn = Math.max(0, paid - total);
  const dueAmount = Math.max(0, total - paid);
  return {
    ...invoice,
    payment_type: invoice.payment_type || payment.payment_type || 'cash',
    payment_method: invoice.payment_method || payment.payment_type || invoice.payment_type || 'cash',
    total,
    paid,
    balance: dueAmount,
    due_amount: dueAmount,
    change_return: changeReturn,
  };
}

function invoiceExtraHeaders(brand = {}) {
  const rules = businessTypeRules(brand);
  if (rules.showImei) return ['IMEI / Serial'];
  if (rules.showBatch || rules.showExpiry) return ['Batch', 'Expiry'];
  return [];
}

function invoiceExtraCells(item, brand = {}) {
  const rules = businessTypeRules(brand);
  if (rules.showImei) return [imeiListText(item)];
  if (rules.showBatch || rules.showExpiry) return [item.batch_number || '', item.expiry_date || ''];
  return [];
}

function printInvoice(sale, cart = [], brand = {}, format = 'a4') {
  const qr = receiptQrData(sale);
  const payment = paymentDisplay(sale);
  const settlement = payment.changeReturn > 0
    ? `<p><strong>Change Return:</strong> ${money(payment.changeReturn)}</p>`
    : `<p><strong>Due Amount:</strong> ${money(payment.dueAmount)}</p>`;
  const extraHeaders = invoiceExtraHeaders(brand);
  const headers = ['Product', 'Sold As', 'Contains', ...extraHeaders, 'Qty', 'Rate', 'Total'];
  const rows = cart.length ? cart.map((item) => {
    const cells = [saleLineDisplayName(item), lineUnitLabel(item), lineConversionLabel(item), ...invoiceExtraCells(item, brand), lineQuantityLabel(item), money(item.price), money(lineTotal(item))];
    return `<tr>${cells.map((cell) => `<td>${cell || ''}</td>`).join('')}</tr>`;
  }).join('') : `<tr><td colspan="${headers.length}">Saved invoice record</td></tr>`;
  const html = `<section class="receipt-shell ${receiptFormatClass(format)}"><div class="receipt-head"><div>${brand?.logo ? `<img src="${brand.logo}" style="max-height:64px">` : ''}<div class="brand">${shopDisplayName(brand)}</div><p class="muted">${brand?.address || ''}<br>${brand?.contact_number || ''}</p></div><div><h2>${brand?.invoice_header || 'Sales Invoice'} ${sale.invoice_number}</h2><p><strong>Invoice Number:</strong> ${sale.invoice_number || ''}</p><p><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</p><p><strong>Date:</strong> ${sale.sold_at ? new Date(sale.sold_at).toLocaleString() : new Date().toLocaleString()}</p><p><strong>QR:</strong> ${qr.replaceAll('\n', ' | ')}</p></div></div><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><h3 class="receipt-total">Grand Total: ${money(payment.total)}</h3><p><strong>Payment Method:</strong> ${payment.method}</p><p><strong>Paid Amount:</strong> ${money(payment.paid)}</p>${settlement}<p class="muted">Warranty notes apply according to product condition and shop policy.</p><p>${brand?.footer || 'Thank you for your business.'}</p></section>`;
  printHtml(`Invoice ${sale.invoice_number}`, html);
}

function printHospitalBill(bill, lines = [], brand = {}) {
  const total = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const paid = Number(bill.paid || 0);
  const rows = lines.map((line) => `<tr><td>${line.description || ''}</td><td>${line.item_type || ''}</td><td>${line.status || 'Completed'}</td><td style="text-align:right">${money(line.amount)}</td></tr>`).join('');
  const html = `<section class="receipt-shell"><div class="receipt-head"><div>${brand?.logo ? `<img src="${brand.logo}" style="max-height:64px">` : ''}<div class="brand">${shopDisplayName(brand)}</div><p class="muted">${brand?.address || ''}<br>${brand?.contact_number || ''}</p></div><div><h2>Hospital Bill ${bill.bill_number || ''}</h2><p>${new Date().toLocaleString()}</p></div></div><p><strong>Patient:</strong> ${bill.patient_name || ''}</p><table><thead><tr><th>Service</th><th>Type</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No services</td></tr>'}</tbody></table><h3 class="receipt-total">Total: ${money(total)}</h3><p>Paid: ${money(paid)} | Balance: ${money(Math.max(0, total - paid))}</p><p>${brand?.footer || 'Thank you.'}</p></section>`;
  printHtml(`Hospital Bill ${bill.bill_number || ''}`, html);
}

function hospitalBillPdfLines(bill, lines = [], brand = {}) {
  const total = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const paid = Number(bill.paid || 0);
  return [
    shopDisplayName(brand),
    brand?.contact_number || '',
    `Bill: ${bill.bill_number || ''}`,
    `Token: ${bill.token_number || ''}`,
    `Patient: ${bill.patient_name || ''}`,
    ...lines.map((line) => `${line.description || ''} - ${line.item_type || ''} - ${line.status || 'Completed'} - ${money(line.amount)}`),
    `Total: ${money(total)}`,
    `Paid: ${money(paid)}`,
    `Balance: ${money(Math.max(0, total - paid))}`,
    brand?.footer || 'Thank you.',
  ];
}

function printPatientTokenSlip(patient, brand = {}) {
  const html = `<section class="receipt-shell thermal"><div class="receipt-head"><div>${brand?.logo ? `<img src="${brand.logo}" style="max-height:52px">` : ''}<div class="brand">${shopDisplayName(brand)}</div><p class="muted">${brand?.address || ''}<br>${brand?.contact_number || ''}</p></div></div><div style="text-align:center;border:2px solid #111;border-radius:12px;padding:16px;margin:12px 0"><div style="font-size:13px;font-weight:800;color:#666">TOKEN NUMBER</div><div style="font-size:42px;font-weight:900;letter-spacing:1px">${patient.token_number || ''}</div></div><p><strong>Patient:</strong> ${patient.patient_name || ''}</p><p><strong>MR:</strong> ${patient.mr_number || ''}</p><p><strong>Doctor:</strong> ${patient.doctor_name || ''}</p><p><strong>Date:</strong> ${patient.visit_date ? new Date(patient.visit_date).toLocaleDateString() : new Date().toLocaleDateString()}</p><p><strong>Diagnosis:</strong> ${patient.diagnosis || ''}</p><p><strong>Instructions:</strong> ${patient.clinical_notes || patient.notes || ''}</p><p class="muted">Reception par yeh slip dikha kar services/billing complete karwain.</p></section>`;
  printHtml(`Token ${patient.token_number || ''}`, html);
}

function invoicePdfLines(invoice, cart, brand = {}) {
  const payment = paymentDisplay(invoice);
  return [
    shopDisplayName(brand),
    brand?.contact_number || '',
    `Invoice Number: ${invoice.invoice_number}`,
    `Customer Name: ${invoice.customer_name || 'Walk-in Customer'}`,
    ...cart.map((item) => {
      const meta = invoiceMetaParts(item, brand).map(([label, value]) => ` | ${label}: ${value}`).join('');
      return `${saleLineDisplayName(item)} | Sold As: ${lineUnitLabel(item)} | Contains: ${lineConversionLabel(item)} | Qty: ${lineQuantityLabel(item)} | Rate: ${money(item.price)} | Total: ${money(lineTotal(item))}${meta}`;
    }),
    `Subtotal: ${money(invoice.subtotal)}`,
    `Discount: ${money(invoice.discount)}`,
    `Tax: ${money(invoice.tax)}`,
    `Payment Method: ${payment.method}`,
    `Grand Total: ${money(payment.total)}`,
    `Paid Amount: ${money(payment.paid)}`,
    payment.changeReturn > 0 ? `Change Return: ${money(payment.changeReturn)}` : `Due Amount: ${money(payment.dueAmount)}`,
    brand?.footer || 'Thank you for your business.',
  ];
}

function invoiceMessage(invoice, brand = {}, cart = []) {
  const payment = paymentDisplay(invoice);
  const items = cart.length ? `\nItems:\n${cart.map((item) => {
    const meta = invoiceMetaParts(item, brand).map(([label, value]) => `\n  ${label}: ${value}`).join('');
    return `- ${saleLineDisplayName(item)}\n  Sold As: ${lineUnitLabel(item)}\n  Contains: ${lineConversionLabel(item)}\n  Qty: ${lineQuantityLabel(item)}\n  Rate: ${money(item.price || 0)}\n  Total: ${money(lineTotal(item))}${meta}`;
  }).join('\n')}` : '';
  const status = invoice.status || (payment.dueAmount > 0 ? 'Credit Due' : 'Paid');
  const settlement = payment.changeReturn > 0 ? `Change Return: ${money(payment.changeReturn)}` : `Due Amount: ${money(payment.dueAmount)}`;
  return `${shopDisplayName(brand)}
Invoice Number: ${invoice.invoice_number}
Customer Name: ${invoice.customer_name || 'Walk-in Customer'}${items}
Payment Method: ${payment.method}
Grand Total: ${money(payment.total)}
Paid Amount: ${money(payment.paid)}
${settlement}
Payment Status: ${status}`;
}

function rowsToPdfLines(rows) {
  if (!rows.length) return ['No Data Available'];
  return rows.slice(0, 40).map((row) => Object.entries(row).slice(0, 6).map(([key, value]) => `${key}: ${value}`).join(' | '));
}

function repairReceiptHtml(repair, brand = {}) {
  const thermal = repair.template === 'Thermal Receipt';
  return `<section class="receipt-shell ${thermal ? 'thermal' : ''}"><div class="receipt-head"><div>${brand?.logo ? `<img src="${brand.logo}" style="max-height:60px">` : ''}<div class="brand">${shopDisplayName(brand)}</div><p class="muted">${brand?.address || ''}<br>${brand?.contact_number || ''}</p></div><div><h2>Repair Receipt ${repair.receipt_number}</h2><p>${repair.date || new Date().toISOString().slice(0, 10)}</p><p><strong>QR:</strong> ${receiptQrData(repair).replaceAll('\n', ' | ')}</p></div></div><table><tbody><tr><th>Customer</th><td>${repair.customer_name || ''}</td></tr><tr><th>Phone</th><td>${repair.phone || ''}</td></tr><tr><th>Device</th><td>${repair.device_name || ''}</td></tr><tr><th>IMEI</th><td>${repair.imei || ''}</td></tr><tr><th>Problem</th><td>${repair.problem || ''}</td></tr><tr><th>Technician</th><td>${repair.technician || ''}</td></tr><tr><th>Delivery Date</th><td>${repair.delivery_date || ''}</td></tr></tbody></table><h3 class="receipt-total">Charges: ${money(repair.repair_charges)}</h3><p>Advance: ${money(repair.advance_payment)} | Remaining: ${money(repair.remaining_amount)}</p><div class="signature"></div><p class="muted">Customer Signature</p><p>${brand?.footer || 'Thank you for choosing us.'}</p></section>`;
}

function printRepairReceipt(repair, brand) {
  printHtml(`Repair Receipt ${repair.receipt_number}`, repairReceiptHtml(repair, brand));
}

function repairReceiptMessage(repair, brand = {}) {
  return `${shopDisplayName(brand)} repair receipt ${repair.receipt_number}\nCustomer: ${repair.customer_name}\nDevice: ${repair.device_name}\nCharges: ${money(repair.repair_charges)}\nAdvance: ${money(repair.advance_payment)}\nRemaining: ${money(repair.remaining_amount)}\nDelivery: ${repair.delivery_date || 'TBC'}`;
}

function repairReceiptPdfLines(repair, brand = {}) {
  return [
    shopDisplayName(brand),
    brand?.contact_number || '',
    brand?.address || '',
    `Receipt Number: ${repair.receipt_number}`,
    `Date: ${repair.date || ''}`,
    `Customer: ${repair.customer_name || ''}`,
    `Phone: ${repair.phone || ''}`,
    `Device: ${repair.device_name || ''}`,
    `IMEI: ${repair.imei || ''}`,
    `Problem: ${repair.problem || ''}`,
    `Repair Charges: ${money(repair.repair_charges)}`,
    `Advance Payment: ${money(repair.advance_payment)}`,
    `Remaining Amount: ${money(repair.remaining_amount)}`,
    `Technician: ${repair.technician || ''}`,
    `Delivery Date: ${repair.delivery_date || ''}`,
    'Customer Signature: ____________________',
    brand?.footer || 'Thank you for choosing us.',
  ];
}

function shopDisplayName(brand = {}) {
  return brand?.shop_name || brand?.company_name || brand?.owner_name || 'Retail Shop';
}

function initials(value) {
  return String(value || 'DSH').split(/\s+/).slice(0, 3).map((part) => part[0]).join('').toUpperCase();
}

createRoot(document.getElementById('root')).render(<App />);


