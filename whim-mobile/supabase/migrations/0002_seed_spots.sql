-- ════════════════════════════════════════════════════════════════════════
-- Whim · seed the spots catalogue (Tokyo)
-- Run AFTER 0001_init.sql. Safe to re-run (on conflict do nothing).
-- ════════════════════════════════════════════════════════════════════════

insert into public.spots (id, city, vibes, title, kind, area, hours, tone, photo, tags, description, lat, lng, nearby)
values
  ('senso', 'Tokyo', '{classics}', 'Sensō-ji Temple', 'Temple', 'Asakusa', 'Open 6:00 AM',
   '#E7DCCB', 'lantern gate at dawn', '{Iconic,Sunrise}',
   'Tokyo''s oldest temple, framed by the giant Kaminarimon lantern and a lane of century-old snack stalls.',
   35.7148, 139.7967,
   '[{"id":"nakamise","title":"Nakamise snack crawl","kind":"Street food","mins":3,"tone":"#E9D7CE","photo":"melon-pan stall"},
     {"id":"kappa","title":"Kappabashi knife street","kind":"Shopping","mins":9,"tone":"#DDE2D6","photo":"handmade knives"},
     {"id":"sumida","title":"Sumida riverwalk","kind":"Stroll","mins":6,"tone":"#D7DEE4","photo":"river & skytree"}]'::jsonb),

  ('meiji', 'Tokyo', '{classics,nature}', 'Meiji Jingū', 'Shrine', 'Harajuku', 'Open at sunrise',
   '#DCE3D8', 'forest torii path', '{Forest,Serene}',
   'A vast evergreen forest in the heart of the city, leading to one of Japan''s grandest Shinto shrines.',
   35.6764, 139.6993,
   '[{"id":"takeshita","title":"Takeshita Street","kind":"Shopping","mins":7,"tone":"#E9D7CE","photo":"crepe stand"},
     {"id":"yoyogi","title":"Yoyogi Park picnic","kind":"Nature","mins":5,"tone":"#DDE2D6","photo":"open lawn"},
     {"id":"omote","title":"Omotesandō cafés","kind":"Coffee","mins":10,"tone":"#E7DCCB","photo":"pour-over bar"}]'::jsonb),

  ('teamlab', 'Tokyo', '{classics,matcha}', 'teamLab Planets', 'Art museum', 'Toyosu', 'Opens 10:00 AM',
   '#DED7E0', 'mirrored water room', '{Immersive,"Book ahead"}',
   'Wade barefoot through water and infinite mirrored rooms in this walk-through digital art museum.',
   35.6499, 139.7906,
   '[{"id":"toyosu","title":"Toyosu Market sushi","kind":"Breakfast","mins":12,"tone":"#E9D7CE","photo":"fresh nigiri"},
     {"id":"teahouse","title":"Garden tea house","kind":"Tea","mins":2,"tone":"#DCE3D8","photo":"matcha set"}]'::jsonb),

  ('tsukiji', 'Tokyo', '{classics}', 'Tsukiji Outer Market', 'Food market', 'Tsukiji', 'Best before noon',
   '#E9D7CE', 'tamagoyaki stall', '{Foodie,"Go early"}',
   'A maze of stalls slinging tamagoyaki skewers, fresh uni and the sharpest knives in the city.',
   35.6654, 139.7707,
   '[{"id":"tama","title":"Tamagoyaki on a stick","kind":"Snack","mins":1,"tone":"#E7DCCB","photo":"sweet omelette"},
     {"id":"hama","title":"Hamarikyū Gardens","kind":"Nature","mins":11,"tone":"#DCE3D8","photo":"tidal pond"}]'::jsonb),

  ('shibuya', 'Tokyo', '{classics,nightlife}', 'Shibuya Sky', 'Observation', 'Shibuya', 'Opens 10:00 AM',
   '#D7DEE4', 'rooftop at dusk', '{Skyline,Sunset}',
   'An open-air rooftop 230m up. The whole city, and on clear evenings Mt. Fuji, glowing at golden hour.',
   35.6580, 139.7016,
   '[{"id":"cross","title":"Shibuya Crossing","kind":"Landmark","mins":2,"tone":"#E9D7CE","photo":"scramble crossing"},
     {"id":"hachiko","title":"Hachikō statue","kind":"Photo stop","mins":3,"tone":"#E7DCCB","photo":"bronze dog"},
     {"id":"vintage","title":"Shibuya vintage shops","kind":"Shopping","mins":6,"tone":"#DDE2D6","photo":"denim racks"}]'::jsonb),

  ('nakame', 'Tokyo', '{matcha,nature}', 'Nakameguro Canal', 'Neighbourhood', 'Nakameguro', 'Anytime',
   '#DDE2D6', 'willow-lined canal', '{Local,Dreamy}',
   'A willow-lined canal threaded with tiny coffee roasters, second-hand bookshops and low-key boutiques.',
   35.6447, 139.6993,
   '[{"id":"roast","title":"Single-origin roastery","kind":"Coffee","mins":4,"tone":"#E7DCCB","photo":"roasting drum"},
     {"id":"books","title":"COW BOOKS reading","kind":"Books","mins":5,"tone":"#DED7E0","photo":"curated shelf"}]'::jsonb)

on conflict (id) do nothing;
