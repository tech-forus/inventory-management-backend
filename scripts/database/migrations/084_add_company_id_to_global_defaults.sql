-- Add company_id column to global_term_defaults table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'global_term_defaults' 
        AND column_name = 'company_id'
    ) THEN 
        ALTER TABLE global_term_defaults 
        ADD COLUMN company_id VARCHAR(255);
        
        -- Add foreign key constraint if companies table exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'companies'
        ) THEN
            ALTER TABLE global_term_defaults 
            ADD CONSTRAINT fk_global_term_defaults_company 
            FOREIGN KEY (company_id) 
            REFERENCES companies(company_id) 
            ON DELETE CASCADE;
        END IF;

        -- Create index for faster lookups
        CREATE INDEX idx_global_term_defaults_company 
        ON global_term_defaults(company_id);
    END IF;
END $$;
