
export const PRODUCT_MASTER = [
  { name: 'อาหารหมูขุน P-921', category: 'FEED', priceRange: [800, 950] },
  { name: 'อาหารหมูขุน P-221', category: 'FEED', priceRange: [750, 900] },
  { name: 'อาหารแม่พันธุ์', category: 'FEED', priceRange: [700, 850] },
  { name: 'รำละเอียด', category: 'FEED', priceRange: [500, 700] },
  { name: 'ปลาป่น', category: 'FEED', priceRange: [1200, 1500] },
  { name: 'กากถั่วเหลือง', category: 'FEED', priceRange: [1000, 1300] },
  { name: 'วิตามินรวม', category: 'MEDICINE', priceRange: [200, 500] },
  { name: 'วัคซีน FMD', category: 'MEDICINE', priceRange: [1500, 3000] },
  { name: 'เข็มฉีดยา เบอร์ 18', category: 'EQUIPMENT', priceRange: [50, 150] },
  { name: 'ถุงมือยาง', category: 'EQUIPMENT', priceRange: [100, 200] },
  { name: 'เด่นรา', category: 'FEED', priceRange: [400, 600] }
];

export const findBestMatch = (input: string) => {
  const normalizedInput = input.toLowerCase().replace(/\s+/g, '');
  return PRODUCT_MASTER.find(p => 
    normalizedInput.includes(p.name.toLowerCase().replace(/\s+/g, '')) ||
    p.name.toLowerCase().replace(/\s+/g, '').includes(normalizedInput)
  );
};
