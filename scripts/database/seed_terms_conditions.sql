-- Seed Data: 20 Standard Terms & Conditions
-- Created: 2026-02-16
-- Format: Placeholders use [VARIABLE_NAME] syntax for easy replacement

-- Clear existing data (only for fresh install)
-- DELETE FROM po_term_variables;
-- DELETE FROM po_terms_conditions;
-- DELETE FROM terms_conditions;

-- Insert 20 Standard Terms & Conditions
INSERT INTO terms_conditions (term_key, term_title, term_value, term_order, is_mandatory, is_system_default, category) VALUES

-- 1. Scope of Supply / Work
('scope_of_supply', 'Scope of Supply / Work', 
'The Supplier shall supply the goods/materials/services strictly in accordance with the approved Technical Specifications, BOQ, drawings, data sheets, and customer approvals forming part of this Purchase Order ("PO"). No deviation in design, make, quantity, or quality shall be permitted without prior written approval of the Purchaser. The Supplier confirms that it has examined all contract documents and shall be responsible for any discrepancies.',
1, TRUE, TRUE, 'general'),

-- 2. Contract Price & Price Basis
('contract_price', 'Contract Price & Price Basis',
'The prices mentioned in this PO are firm and fixed till completion of the contract and shall not be subject to any escalation. The Contract Price shall be inclusive of packing, forwarding, handling, and loading at Supplier''s works unless explicitly stated otherwise in the PO. The Supplier confirms that the price is sufficient to meet all contractual obligations.',
2, TRUE, TRUE, 'general'),

-- 3. Taxes & Duties (GST)
('taxes_gst', 'Taxes & Duties (GST)',
'Goods and Services Tax (GST) shall be payable as applicable as per prevailing law and HSN codes. GST payment by the Purchaser shall be subject to:
• Correct tax invoice submission with PO reference and HSN codes
• Reflection of GST credit in Purchaser''s GSTR-2B
• Supplier depositing the tax with the Government
Any loss due to non-compliance by the Supplier shall be recoverable from the Supplier.',
3, TRUE, TRUE, 'general'),

-- 4. Delivery Terms & Destination
('delivery_terms', 'Delivery Terms & Destination',
'Delivery shall be as per Incoterms / commercial terms specified in the PO (EX-WORKS / FOR Site / CIF / FOB).
Delivery Location: [DELIVERY_LOCATION]
No material shall be dispatched without written Dispatch Clearance from the Purchaser. Transit risk shall be borne by the Supplier until delivery at the destination unless otherwise stated.',
4, TRUE, TRUE, 'general'),

-- 5. Delivery Schedule & Time of Essence
('delivery_schedule', 'Delivery Schedule & Time of Essence',
'Delivery shall be completed strictly as per the schedule mentioned in the PO. Time is the essence of the contract. Any delay shall attract Liquidated Damages as per Clause 6. Partial deliveries shall be allowed only with prior written consent of the Purchaser.',
5, TRUE, TRUE, 'general'),

-- 6. Liquidated Damages (LD)
('liquidated_damages', 'Liquidated Damages (LD)',
'In case of delay in delivery beyond the agreed schedule, LD shall be levied at [LD_PERCENTAGE]% per week or part thereof, subject to a maximum of [LD_CAP]% of the total PO value (excluding taxes). LD shall be deducted from any amount payable to the Supplier. LD is without prejudice to Purchaser''s other contractual rights.',
6, TRUE, TRUE, 'general'),

-- 7. Inspection & Quality Assurance
('inspection_qa', 'Inspection & Quality Assurance',
'The Purchaser and/or its customer/third-party agency reserves the right to inspect the material at the Supplier''s works and/or at site. All inspection costs shall be borne by the Supplier. Material found non-conforming may be rejected and shall be replaced by the Supplier at its own cost. The Purchaser reserves the right to conduct random testing of supplied lots.',
7, FALSE, TRUE, 'general'),

-- 8. Packing, Forwarding & Transportation
('packing_forwarding', 'Packing, Forwarding & Transportation',
'The Supplier shall ensure safe, weatherproof, and transit-worthy packing. All damages due to inadequate packing or mishandling during transit shall be replaced by the Supplier at its own cost. Loading and unloading at both ends shall be the Supplier''s responsibility unless stated otherwise in the PO.',
8, FALSE, TRUE, 'general'),

-- 9. Warranty / Defect Liability
('warranty', 'Warranty / Defect Liability',
'The Supplier warrants that all goods supplied shall be new, unused, and free from defects.
Warranty Period: [WARRANTY_DURATION]
Defective items shall be repaired or replaced within [WARRANTY_REPLACEMENT_DAYS] days of notification at Supplier''s cost. Warranty on replaced items shall recommence from the date of replacement.',
9, TRUE, TRUE, 'general'),

-- 10. Performance Bank Guarantee (If Applicable)
('performance_guarantee', 'Performance Bank Guarantee (If Applicable)',
'The Supplier shall furnish a Performance Bank Guarantee (PBG) of [PBG_PERCENTAGE]% of PO value (excluding taxes) within [PBG_SUBMISSION_DAYS] days of PO date, valid till completion of warranty period. The PBG may be invoked in case of non-performance or breach of contract.',
10, FALSE, TRUE, 'general'),

-- 11. Payment Terms
('payment_terms', 'Payment Terms',
'Payment shall be made as per terms specified in the PO, subject to:
• Receipt and acceptance of material at site
• Submission of complete documents (Invoice, Delivery Challan, LR, Packing List, Test Certificates, Warranty Certificate, etc.)
GST payment is subject to compliance with Clause 3. Any incorrect or incomplete documentation may lead to payment delay.',
11, TRUE, TRUE, 'general'),

-- 12. Rejection & Replacement
('rejection_replacement', 'Rejection & Replacement',
'If any goods are found defective or non-conforming, the Purchaser reserves the right to reject the same. The Supplier shall replace rejected material at its own cost within [REJECTION_REPLACEMENT_DAYS] days. Failure to replace shall entitle the Purchaser to procure from alternate sources at Supplier''s risk and cost.',
12, FALSE, TRUE, 'general'),

-- 13. Cancellation / Termination
('cancellation', 'Cancellation / Termination',
'The Purchaser reserves the right to cancel the PO, in part or full, in case of:
• Breach of any contractual terms
• Failure to meet delivery schedule
• Quality non-compliance
In such case, the Purchaser may procure the balance quantity from alternate sources at Supplier''s risk and cost.',
13, FALSE, TRUE, 'general'),

-- 14. Force Majeure
('force_majeure', 'Force Majeure',
'Neither party shall be liable for failure due to Force Majeure events such as natural calamities, war, government restrictions, etc. The affected party shall notify the other within [FORCE_MAJEURE_NOTICE_DAYS] days. If the Force Majeure continues beyond [FORCE_MAJEURE_TERMINATION_DAYS] days, either party may terminate the PO without liability.',
14, FALSE, TRUE, 'general'),

-- 15. Assignment & Sub-Contracting
('assignment_subcontracting', 'Assignment & Sub-Contracting',
'The Supplier shall not assign or sub-contract the PO, in whole or in part, without prior written approval of the Purchaser. Approval shall not absolve the Supplier of contractual responsibilities.',
15, FALSE, TRUE, 'general'),

-- 16. Confidentiality
('confidentiality', 'Confidentiality',
'All technical, commercial, and contractual information exchanged shall be treated as confidential and shall not be disclosed to any third party without prior written consent of the Purchaser.',
16, FALSE, TRUE, 'general'),

-- 17. Arbitration
('arbitration', 'Arbitration',
'All disputes arising out of or in connection with this PO shall be resolved amicably. Failing which, disputes shall be referred to arbitration under the Arbitration & Conciliation Act, 1996. Arbitration shall be conducted in [ARBITRATION_CITY] in English.',
17, TRUE, TRUE, 'general'),

-- 18. Jurisdiction
('jurisdiction', 'Jurisdiction',
'Courts at [JURISDICTION_CITY] shall have exclusive jurisdiction over all disputes arising out of this PO.',
18, TRUE, TRUE, 'general'),

-- 19. Governing Law
('governing_law', 'Governing Law',
'This PO shall be governed by and construed in accordance with the laws of India.',
19, TRUE, TRUE, 'general'),

-- 20. Order of Precedence
('order_precedence', 'Order of Precedence',
'In case of conflict between documents:
1. Purchase Order (PO)
2. Special Conditions of Contract (SCC)
3. General Conditions of Contract (GCC)
4. Vendor Quotation
5. Other Documents',
20, FALSE, TRUE, 'general');

-- Verify insertion
SELECT COUNT(*) as total_terms FROM terms_conditions;
