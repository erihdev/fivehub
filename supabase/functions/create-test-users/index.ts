import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestUser {
  email: string;
  password: string;
  role: string;
  fullName: string;
  companyName: string;
  city: string;
  phone: string;
  commercialReg?: string;
}

const testUsers: TestUser[] = [
  {
    email: 'farm@test.com',
    password: 'Test@123456',
    role: 'farm',
    fullName: 'أحمد المزارع',
    companyName: 'مزرعة الجبل الأخضر',
    city: 'جازان',
    phone: '+966501234567',
  },
  {
    email: 'supplier@test.com',
    password: 'Test@123456',
    role: 'supplier',
    fullName: 'محمد المورد',
    companyName: 'شركة البن الذهبي للتوريد',
    city: 'جدة',
    phone: '+966502345678',
    commercialReg: 'CR-1234567890',
  },
  {
    email: 'roaster@test.com',
    password: 'Test@123456',
    role: 'roaster',
    fullName: 'خالد المحمص',
    companyName: 'محمصة النخبة',
    city: 'الرياض',
    phone: '+966503456789',
    commercialReg: 'CR-2345678901',
  },
  {
    email: 'cafe@test.com',
    password: 'Test@123456',
    role: 'cafe',
    fullName: 'سعد المقهى',
    companyName: 'مقهى الفنجان الذهبي',
    city: 'الدمام',
    phone: '+966504567890',
    commercialReg: 'CR-3456789012',
  },
  {
    email: 'maintenance@test.com',
    password: 'Test@123456',
    role: 'maintenance',
    fullName: 'عبدالله الفني',
    companyName: 'خدمات صيانة معدات القهوة',
    city: 'مكة',
    phone: '+966505678901',
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const results: any[] = [];

    for (const user of testUsers) {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.fullName,
        },
      });

      if (authError) {
        console.error(`Error creating user ${user.email}:`, authError);
        results.push({ email: user.email, error: authError.message });
        continue;
      }

      const userId = authData.user.id;

      // Create user_roles entry with approved status
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: user.role,
        status: 'approved',
        company_name: user.companyName,
        city: user.city,
        phone: user.phone,
        commercial_registration: user.commercialReg || null,
      });

      if (roleError) {
        console.error(`Error creating role for ${user.email}:`, roleError);
      }

      // Update profile
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: userId,
        full_name: user.fullName,
        role: user.role,
        business_name: user.companyName,
        city: user.city,
      });

      if (profileError) {
        console.error(`Error updating profile for ${user.email}:`, profileError);
      }

      // Add role-specific data
      if (user.role === 'supplier') {
        // Create supplier record
        const { data: supplierData, error: supplierError } = await supabase.from('suppliers').insert({
          user_id: userId,
          name: user.companyName,
          country: 'Saudi Arabia',
          origin: 'جازان، السعودية',
          specialty: 'قهوة عربية مختصة',
          contact_email: user.email,
          approved: true,
        }).select().single();

        if (!supplierError && supplierData) {
          // Add coffee offerings
          const coffeeOfferings = [
            { name: 'بن جازان الفاخر', origin: 'Saudi Arabia', region: 'جازان', variety: 'أرابيكا', process: 'مغسول', flavor: 'فواكه استوائية، شوكولاتة', price: 85, score: 86, altitude: '1800-2000م' },
            { name: 'إثيوبي يرغاشيفي', origin: 'Ethiopia', region: 'يرغاشيفي', variety: 'هيرلوم', process: 'مجفف طبيعي', flavor: 'توت، ياسمين، عسل', price: 120, score: 88, altitude: '1900-2200م' },
            { name: 'كولومبي هويلا', origin: 'Colombia', region: 'هويلا', variety: 'كاتورا', process: 'مغسول', flavor: 'كراميل، تفاح أخضر', price: 95, score: 85, altitude: '1600-1900م' },
            { name: 'كيني AA', origin: 'Kenya', region: 'نيري', variety: 'SL28', process: 'مغسول مزدوج', flavor: 'كشمش أسود، طماطم', price: 140, score: 89, altitude: '1700-2000م' },
            { name: 'يمني مطري', origin: 'Yemen', region: 'مطري', variety: 'تيبيكا', process: 'مجفف طبيعي', flavor: 'توابل، فواكه مجففة', price: 200, score: 90, altitude: '2000-2400م' },
          ];

          for (const coffee of coffeeOfferings) {
            await supabase.from('coffee_offerings').insert({
              supplier_id: supplierData.id,
              ...coffee,
              currency: 'SAR',
              available: true,
            });
          }
        }
      }

      if (user.role === 'farm') {
        // Add farm crop offers
        const cropOffers = [
          { crop_name: 'بن جازان الممتاز', crop_name_ar: 'بن جازان الممتاز', variety: 'أرابيكا', quantity_kg: 500, price_per_kg: 45, processing_method: 'مغسول', altitude: '1800م', description: 'محصول موسم 2024 من مرتفعات جازان' },
          { crop_name: 'بن الداير', crop_name_ar: 'بن الداير', variety: 'تيبيكا', quantity_kg: 300, price_per_kg: 55, processing_method: 'مجفف طبيعي', altitude: '2000م', description: 'بن عضوي من منطقة الداير' },
          { crop_name: 'بن فيفا', crop_name_ar: 'بن فيفا', variety: 'أرابيكا', quantity_kg: 200, price_per_kg: 60, processing_method: 'عسلي', altitude: '1900م', description: 'إنتاج محدود من مرتفعات فيفا' },
        ];

        for (const crop of cropOffers) {
          await supabase.from('farm_crop_offers').insert({
            farm_id: userId,
            ...crop,
            currency: 'SAR',
            status: 'available',
            harvest_date: new Date().toISOString(),
          });
        }
      }

      if (user.role === 'roaster') {
        // Add roasted coffee products
        const roastedProducts = [
          { name: 'خلطة الصباح', description: 'خلطة متوازنة للاستخدام اليومي', roast_level: 'متوسط', price_per_kg: 150, origin_blend: 'برازيل، كولومبيا', flavor_notes: ['شوكولاتة', 'جوز', 'كراميل'] },
          { name: 'إسبريسو الذهب', description: 'خلطة غنية للإسبريسو', roast_level: 'داكن', price_per_kg: 180, origin_blend: 'إثيوبيا، كينيا', flavor_notes: ['كاكاو', 'توت', 'عسل'] },
          { name: 'سنجل أوريجن إثيوبي', description: 'قهوة أحادية المصدر', roast_level: 'فاتح', price_per_kg: 220, origin_blend: 'إثيوبيا - يرغاشيفي', flavor_notes: ['ياسمين', 'ليمون', 'خوخ'] },
        ];

        for (const product of roastedProducts) {
          await supabase.from('roasted_coffee_products').insert({
            roaster_id: userId,
            ...product,
            currency: 'SAR',
            available: true,
            quantity_available_kg: 100,
          });
        }
      }

      if (user.role === 'cafe') {
        // Add cafe inventory
        const inventoryItems = [
          { product_name: 'خلطة الصباح', quantity_kg: 25, min_quantity_kg: 5, auto_reorder: true },
          { product_name: 'إسبريسو الذهب', quantity_kg: 15, min_quantity_kg: 3, auto_reorder: true },
          { product_name: 'سنجل أوريجن', quantity_kg: 8, min_quantity_kg: 2, auto_reorder: false },
        ];

        for (const item of inventoryItems) {
          await supabase.from('cafe_inventory').insert({
            cafe_id: userId,
            ...item,
          });
        }

        // Add loyalty points
        await supabase.from('cafe_loyalty_points').insert({
          cafe_id: userId,
          points_balance: 2500,
          total_points_earned: 5000,
          total_points_redeemed: 2500,
          tier: 'gold',
        });
      }

      if (user.role === 'maintenance') {
        // Add maintenance requests/reports data would go here
        // This role primarily receives requests from other users
      }

      results.push({
        email: user.email,
        password: user.password,
        role: user.role,
        companyName: user.companyName,
        success: true,
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Test users created successfully',
      users: results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
