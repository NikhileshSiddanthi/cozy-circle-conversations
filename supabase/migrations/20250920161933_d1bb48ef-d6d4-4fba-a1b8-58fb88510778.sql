-- Update Social Issues category to Social/Cultural
UPDATE categories 
SET name = 'Social/Cultural', description = 'Groups focused on social and cultural issues, movements, and discussions' 
WHERE id = 'd03761e2-859f-4361-b295-b444f5a1d940';

-- Delete specific groups as requested
DELETE FROM groups WHERE id IN (
  'c4881024-bb52-4223-bf45-e37d586ee457', -- Test 1 from Economy & Business
  '6304d445-d9d4-469e-9912-e8924de201a4', -- Anurag College from Organizations
  '7736d139-9aba-47fd-98d7-f4d46cd669d2'  -- Greenspace The Hive from Organizations
);

-- Note: Trump Discussion, Hive Sattva Magnus, and Film Media & Entertainment groups were not found in the query results
-- This might be because they have different names or have already been deleted