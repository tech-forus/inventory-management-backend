-- Migration: Add Fixed Legal Clauses
-- Description: Adds mandatory fixed clauses for confidentiality, severability, etc.
-- Date: 2026-02-17

-- 1. Confidentiality (Fixed)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'CONFIDENTIALITY',
    'Confidentiality',
    'The Supplier shall keep confidential all technical and commercial information provided by the Purchaser and shall not disclose it to any third party without prior written consent, except for the purpose of executing this PO.',
    true,
    true,
    150,
    'General'
);

-- 2. Severability (Fixed)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'SEVERABILITY',
    'Severability',
    'If any provision of this PO is held to be invalid, illegal or unenforceable, the validity, legality and enforceability of the remaining provisions shall not in any way be affected or impaired.',
    true,
    true,
    160,
    'General'
);

-- 3. Entire Agreement (Fixed)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'ENTIRE_AGREEMENT',
    'Entire Agreement',
    'This PO, including its terms and conditions, constitutes the entire agreement between the parties and supersedes all prior agreements, understandings, negotiations and discussions, whether oral or written.',
    true,
    true,
    170,
    'General'
);

-- 4. Notices (Fixed)
INSERT INTO terms_conditions (term_key, term_title, term_value, is_mandatory, is_system_default, term_order, category)
VALUES (
    'NOTICES',
    'Notices',
    'Any notice required to be given under this PO shall be in writing and shall be deemed to have been duly given if delivered by hand, sent by registered post, or emailed to the authorized representatives of the parties.',
    true,
    true,
    180,
    'General'
);
