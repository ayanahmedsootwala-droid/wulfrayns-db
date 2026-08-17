
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@autodesk.pk';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'admin@autodesk.pk',
      crypt('Admin@123', gen_salt('bf')),
      NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin","role":"admin"}',
      NOW(), NOW(),
      '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'admin@autodesk.pk',
      json_build_object('sub', v_user_id::text, 'email', 'admin@autodesk.pk'),
      'email',
      NOW(), NOW(), NOW()
    );
  END IF;
END $$;
