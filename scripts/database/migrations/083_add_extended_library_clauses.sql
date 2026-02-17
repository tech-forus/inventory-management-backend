-- Migration: Add Extended Library Clauses
-- Description: Adds 15 highly professional clauses to the optional Clause Library.
-- Date: 2026-02-17

-- 1. Anti-Bribery & Corruption (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('ABC_POLICY', 'Anti-Bribery & Corruption', 'The Supplier warrants that neither it nor its employees have offered or will offer any bribe, kickback, or improper payment to any employee of the Purchaser to secure this PO.', false, false, 200, 'Compliance');

-- 2. Right of Set-Off (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('SET_OFF', 'Right of Set-Off', 'The Purchaser shall be entitled to set off any amount owed by the Supplier to the Purchaser against any amount payable by the Purchaser under this or any other PO.', false, false, 210, 'Financial');

-- 3. Time is of the Essence (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('TIME_ESSENCE', 'Time is of the Essence', 'Time is the essence of this contract. The Supplier acknowledges that any delay in delivery will cause significant loss to the Purchaser, justifying the enforcement of LD and termination rights.', false, false, 220, 'Legal & Liability');

-- 4. Risk of Loss & Title Transfer (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('TITLE_RISK', 'Risk of Loss & Title Transfer', 'Title and Risk of Loss to the goods shall pass to the Purchaser only upon physical delivery and acceptance at the designated location.', false, false, 230, 'Logistics');

-- 5. Compliance with Laws (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('STATUTORY_COMPLIANCE', 'Compliance with Laws', 'The Supplier shall comply with all applicable local, state, and central laws, including but not limited to labor laws, environmental regulations, and tax statutes.', false, false, 240, 'Compliance');

-- 6. No Waiver (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('NO_WAIVER', 'No Waiver', 'Failure by the Purchaser to enforce any provision of this PO at any time shall not be construed as a waiver of its right to enforce such provision at a later date.', false, false, 250, 'Legal & Liability');

-- 7. Packing List & Challan Requirements (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('DOC_REQUIREMENTS', 'Packing List & Challan Requirements', 'Every consignment must be accompanied by a Packing List and Delivery Challan referencing the PO Number, Part Number, and Quantity. Materials without proper documentation may be rejected at the gate.', false, false, 260, 'Logistics');

-- 8. Rejected Material Storage Charges (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('REJECTION_STORAGE', 'Rejected Material Storage Charges', 'Rejected material must be collected by the Supplier within 7 days of notification. Post this period, the Purchaser reserves the right to charge storage fees or dispose of the material at the Supplier''s risk.', false, false, 270, 'Logistics');

-- 9. Non-Poaching / Non-Solicitation (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('NON_SOLICITATION', 'Non-Poaching / Non-Solicitation', 'During the term of this PO and for 12 months thereafter, neither party shall directly or indirectly solicit or hire any employee of the other party involved in the execution of this PO.', false, false, 280, 'HR & Admin');

-- 10. Relationship of Parties (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('INDEPENDENT_CONTRACTOR', 'Relationship of Parties', 'The Supplier is an independent contractor. Nothing in this PO shall indicate a partnership, joint venture, or employer-employee relationship.', false, false, 290, 'Legal & Liability');

-- 11. Import/Export Controls (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('EXPORT_CONTROL', 'Import/Export Controls', 'The Supplier warrants that the goods supplied do not violate any applicable export control laws or sanctions.', false, false, 300, 'Compliance');

-- 12. Barcode & Labeling Standards (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('BARCODE_LABELING', 'Barcode & Labeling Standards', 'All packages must be labeled with Barcodes as per Purchaser''s specifications to facilitate automated receipt. Non-compliant labeling may attract a penalty of [LABEL_PENALTY_AMOUNT] per box.', false, false, 310, 'Logistics');

-- 13. Change Orders / Amendment (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('CHANGE_ORDER', 'Change Orders / Amendment', 'No modification or amendment to this PO shall be valid unless in writing and signed by an authorized representative of the Purchaser.', false, false, 320, 'General');

-- 14. Survival (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('SURVIVAL', 'Survival', 'Clauses relating to Warranty, Indemnity, Confidentiality, and Dispute Resolution shall survive the termination or expiration of this PO.', false, false, 330, 'Legal & Liability');

-- 15. Conflict of Interest (Library)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES ('CONFLICT_INTEREST', 'Conflict of Interest', 'The Supplier certifies that no conflict of interest exists between the Supplier and any employee of the Purchaser that could influence the award or administration of this PO.', false, false, 340, 'Compliance');
