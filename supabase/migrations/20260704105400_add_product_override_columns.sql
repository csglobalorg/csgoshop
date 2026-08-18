-- Add new columns for category and name overrides if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_overrides' AND column_name = 'override_name') THEN
        ALTER TABLE public.product_overrides ADD COLUMN override_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_overrides' AND column_name = 'override_category') THEN
        ALTER TABLE public.product_overrides ADD COLUMN override_category text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_overrides' AND column_name = 'override_subcategory') THEN
        ALTER TABLE public.product_overrides ADD COLUMN override_subcategory text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_overrides' AND column_name = 'override_sub_subcategory') THEN
        ALTER TABLE public.product_overrides ADD COLUMN override_sub_subcategory text;
    END IF;
END $$;
