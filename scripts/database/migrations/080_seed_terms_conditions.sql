-- Migration: Seed Terms & Conditions (Updated with Enhanced Legal Clauses)
-- Description: Populates the terms_conditions table with industry-standard procurement clauses.
-- Date: 2026-02-17

-- Clear existing data to avoid duplicates during development/reseeding
DELETE FROM terms_conditions;

-- 1. Delivery Terms (Variable)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'DELIVERY_PERIOD',
    'Delivery Period',
    'Delivery shall be completed within [DELIVERY_PERIOD] days from the date of Purchase Order (PO) acceptance by the Supplier.',
    1, -- Mandatory
    1, -- System Default
    10,
    'Logistics'
);

-- 2. Delivery Destination & Incoterms (Variable)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'DELIVERY_DESTINATION',
    'Delivery Destination',
    'Delivery shall be on [INCOTERMS] basis to [DELIVERY_LOCATION]. No material shall be dispatched without written Dispatch Clearance from the Purchaser. Transit risk shall be borne by the Supplier until delivery at the destination, unless otherwise stated.',
    1,
    1,
    20,
    'Logistics'
);

-- 3. Freight Cost (Variable)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'FREIGHT_COST',
    'Freight Charges',
    'Freight Charges shall be [FREIGHT_COST] in the PO value, unless otherwise specified in writing.',
    1,
    1,
    30,
    'Financial'
);

-- 4. Payment Terms (Variable - Critical)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'PAYMENT_TERMS',
    'Payment Terms',
    'Payment shall be made [PAYMENT_TERMS] days after receipt and acceptance of materials at site and submission of correct invoice with all supporting documents.',
    1,
    1,
    40,
    'Financial'
);

-- 5. Liquidated Damages (Variable - High Commercial Impact)
-- Updated cap to 5% as per recommendation
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'LIQUIDATED_DAMAGES',
    'Liquidated Damages (LD)',
    'In case of delay beyond the agreed delivery schedule, Liquidated Damages (LD) shall be levied at [LD_PERCENTAGE]% per week or part thereof, subject to a maximum of [LD_CAP]% of the total PO value (excluding taxes). LD shall be deducted from any amount payable to the Supplier.',
    1,
    1,
    50,
    'Financial'
);

-- 6. Warranty / Defect Liability (Variable)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'WARRANTY',
    'Warranty / Defect Liability',
    'The Supplier warrants that all goods supplied shall be new, unused, and free from defects in material and workmanship. Warranty Period: [WARRANTY_DURATION]. Any defective material shall be repaired or replaced within [WARRANTY_REPLACEMENT_DAYS] days from the date of written notification by the Purchaser, at the Supplier’s cost.',
    1,
    1,
    60,
    'Legal & Liability'
);

-- 7. Inspection & Rejection (Optional/Library - High Risk Protection)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'INSPECTION_REJECTION',
    'Inspection & Rejection Rights',
    'The Purchaser reserves the right to inspect materials at the Supplier’s premises or upon receipt at site. Materials not strictly in accordance with specifications, quality standards, or approved samples may be rejected and returned at the Supplier''s cost and risk.',
    0, -- Optional
    0, 
    70,
    'Legal & Liability'
);

-- 8. Arbitration (Fixed/Variable Hybrid - City is variable but usually standard)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'ARBITRATION',
    'Arbitration',
    'All disputes arising out of or in connection with this PO shall be resolved amicably. Failing which, disputes shall be referred to arbitration in accordance with the Arbitration & Conciliation Act, 1996. Arbitration shall be conducted in [ARBITRATION_CITY], in the English language.',
    1,
    1,
    80,
    'Legal & Liability'
);

-- 9. Jurisdiction (Fixed/Variable Hybrid)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'JURISDICTION',
    'Legal Jurisdiction',
    'Courts at [JURISDICTION_CITY] shall have exclusive jurisdiction over all disputes arising out of or in connection with this PO.',
    1,
    1,
    90,
    'Legal & Liability'
);

-- 10. Force Majeure (Optional/Library - Critical for Long Term Contracts)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'FORCE_MAJEURE',
    'Force Majeure',
    'Neither party shall be liable for failure to perform obligations under this PO if such failure is a result of Acts of God (fire, flood, earthquake), war, hostilities, civil war, rebellion, government sanction, blockage, embargo, or labor dispute. The affected party must notify the other within [FORCE_MAJEURE_NOTICE_DAYS] days.',
    0, -- Optional
    0,
    100,
    'General'
);

-- 11. Termination for Default (Optional/Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'TERMINATION_DEFAULT',
    'Termination for Default',
    'The Purchaser reserves the right to terminate this PO in whole or in part for default if the Supplier fails to deliver goods within the time specified, fails to perform any other obligation, or becomes bankrupt or insolvent.',
    0, -- Optional
    0,
    110,
    'Legal & Liability'
);

-- 12. Indemnity (Optional/Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'INDEMNITY',
    'Indemnity',
    'The Supplier shall indemnify the Purchaser against all claims, liabilities, costs, damages, and expenses (including legal fees) arising out of any breach of this PO, negligence, or infringement of intellectual property rights by the Supplier.',
    0, -- Optional
    0,
    120,
    'Legal & Liability'
);

-- 13. Governing Law (Fixed - Standard)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'GOVERNING_LAW',
    'Governing Law',
    'This Purchase Order shall be governed by and construed in accordance with the laws of India.',
    1, -- Mandatory
    1,
    130,
    'Legal & Liability'
);

-- 14. Performance Bank Guarantee (Optional - High Value Items)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'PBG',
    'Performance Bank Guarantee (PBG)',
    'The Supplier shall submit a Performance Bank Guarantee (PBG) for [PBG_PERCENTAGE]% of the basic PO value, valid until the expiry of the warranty period plus a claim period of 3 months. The PBG must be submitted within [PBG_SUBMISSION_DAYS] days of PO acceptance.',
    0, -- Optional
    0,
    140,
    'Financial'
);
