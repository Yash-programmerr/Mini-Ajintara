export const seedAccounts = [
  { name: 'Ananya Rao', email: 'guest@ajintara.test', role: 'guest' },
  { name: 'Devika Naik', email: 'partner1@ajintara.test', role: 'partner' },
  { name: 'Kabir Sharma', email: 'partner2@ajintara.test', role: 'partner' },
];

const room = (name, basePricePaise, totalRooms, maxGuests) => ({
  name, basePricePaise, totalRooms, maxGuests,
});

function listing(partner, status, name, city, address, description, amenities, rooms) {
  const slug = name.toLowerCase().replaceAll(' ', '-');
  const images = ['exterior', 'interior'].map((view) =>
    `https://picsum.photos/seed/${slug}-${view}/800/600`);
  return { partner, status, property: { name, city, address, description, amenities, images }, rooms };
}

export const rejectReason = 'Please replace the lobby photographs and confirm the street entrance shown on the listing.';

export const demoCatalog = [
  listing(1, 'approved', 'Mandovi Verandah', 'Goa', '18 Rua de Ourem, Fontainhas, Panaji',
    'A restored courtyard house in the Latin Quarter, with shaded verandahs a short walk from the Mandovi river.',
    ['Breakfast', 'Wi-Fi', 'Courtyard', 'Air conditioning'],
    [room('Courtyard Double', 425000, 8, 2), room('Verandah King', 625000, 4, 3), room('Last Room Suite', 750000, 1, 4)]),
  listing(1, 'approved', 'Ashwem Palm Court', 'Goa', '71 Ashwem Beach Road, Mandrem',
    'Low-rise cottages behind the dunes with an outdoor shower and a breakfast deck facing the coconut grove.',
    ['Beach access', 'Breakfast', 'Pool', 'Wi-Fi'],
    [room('Palm Cottage', 580000, 7, 3), room('Garden Villa', 1040000, 3, 6)]),
  listing(1, 'approved', 'Chandpole Haveli', 'Jaipur', '36 Khajane Walon Ka Rasta, Chandpole',
    'A family haveli near the bazaar with painted ceilings and a rooftop that looks towards Nahargarh Fort.',
    ['Rooftop terrace', 'Restaurant', 'Wi-Fi'],
    [room('Painted Chamber', 510000, 9, 2), room('Haveli Suite', 800000, 3, 4)]),
  listing(1, 'approved', 'Bani Park Guesthouse', 'Jaipur', '12 Shiv Marg, Bani Park',
    'Quiet rooms around a neem-shaded lawn in a residential neighbourhood close to Jaipur Junction.',
    ['Breakfast', 'Garden', 'Parking', 'Laundry'],
    [room('Garden Twin', 290000, 10, 2), room('Family Floor', 480000, 2, 5)]),
  listing(1, 'approved', 'Colaba Harbour House', 'Mumbai', '14 Henry Road, Colaba',
    'A harbour-side townhouse with high ceilings, reading nooks and easy access to the morning ferries.',
    ['Wi-Fi', 'Air conditioning', 'Breakfast', 'Lift'],
    [room('Harbour Double', 690000, 12, 2), room('Corner Studio', 875000, 5, 3), room('Harbour Penthouse', 1400000, 2, 5)]),
  listing(1, 'pending', 'Dadar Artists Lodge', 'Mumbai', '25 Ranade Road, Dadar West',
    'A small lodge by the flower market with block-printed fabrics and a shared breakfast table.',
    ['Breakfast', 'Wi-Fi', 'Luggage storage'],
    [room('Market Twin', 385000, 6, 2), room('Balcony Studio', 540000, 3, 3)]),
  listing(1, 'approved', 'Beas Orchard Inn', 'Manali', '9 Orchard Lane, Prini',
    'Apple trees surround this hillside inn above the Beas, where the dining room serves seasonal valley produce.',
    ['Mountain views', 'Heating', 'Garden', 'Parking'],
    [room('Orchard Double', 360000, 8, 2), room('River Loft', 650000, 3, 4)]),
  listing(1, 'approved', 'Deodar Ridge Chalet', 'Manali', '22 Log Huts Road, Old Manali',
    'Timber chalets at the edge of the deodar forest with sheltered balconies and a fireside lounge.',
    ['Heating', 'Breakfast', 'Mountain views'],
    [room('Forest Chalet', 570000, 4, 3), room('Ridge Family Chalet', 960000, 2, 6)]),
  listing(2, 'approved', 'Sal River Retreat', 'Goa', '8 Fishermen Lane, Cavelossim',
    'Garden rooms facing a quiet bend of the Sal, with bicycles available for the short ride to the beach.',
    ['Bicycles', 'Garden', 'Wi-Fi', 'Parking'],
    [room('River Twin', 395000, 7, 2), room('Estuary Suite', 720000, 2, 4)]),
  listing(2, 'rejected', 'Mapusa Market Rooms', 'Goa', '52 Market Road, Mapusa',
    'Simple rooms above the old market, within walking distance of spice stalls and the bus stand.',
    ['Wi-Fi', 'Air conditioning', 'Luggage storage'],
    [room('Bazaar Double', 245000, 9, 2), room('Courtyard Triple', 340000, 4, 3)]),
  listing(2, 'approved', 'Amber Stepwell House', 'Jaipur', '16 Panna Meena Road, Amer',
    'A sandstone inn near the stepwell, with cool tiled rooms and evening meals on a fort-facing terrace.',
    ['Rooftop terrace', 'Restaurant', 'Parking', 'Wi-Fi'],
    [room('Stepwell Double', 460000, 8, 2), room('Fort View Suite', 765000, 3, 4)]),
  listing(2, 'pending', 'Civil Lines Bungalow', 'Jaipur', '44 Jacob Road, Civil Lines',
    'A garden bungalow with broad porches and interconnecting rooms suited to families visiting the Pink City.',
    ['Garden', 'Parking', 'Breakfast'],
    [room('Porch King', 490000, 6, 2), room('Family Wing', 830000, 2, 6)]),
  listing(2, 'approved', 'Bandra Chapel Studios', 'Mumbai', '7 Chapel Road, Bandra West',
    'Independent studios on a mural-lined lane, close to Bandstand and neighbourhood bakeries.',
    ['Kitchenette', 'Wi-Fi', 'Air conditioning', 'Laundry'],
    [room('Village Studio', 610000, 8, 2), room('Terrace Apartment', 990000, 3, 4)]),
  listing(2, 'approved', 'Solang Meadow Lodge', 'Manali', '5 Valley Road, Solang',
    'A stone lodge overlooking the meadow, with boot storage and hot breakfasts for early walkers.',
    ['Mountain views', 'Heating', 'Breakfast', 'Parking'],
    [room('Meadow Twin', 335000, 9, 2), room('Valley King', 530000, 5, 3), room('Loft Suite', 810000, 2, 5)]),
];
