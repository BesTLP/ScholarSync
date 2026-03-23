export const COUNTRY_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['china', 'prc', '中国', '中华人民共和国'], canonical: '中国' },
  { aliases: ['usa', 'us', 'u.s.', 'u.s.a.', 'united states', 'america', '美国'], canonical: '美国' },
  { aliases: ['uk', 'u.k.', 'united kingdom', 'england', 'britain', 'great britain', '英国'], canonical: '英国' },
  { aliases: ['australia', 'australian', 'au', '澳洲', '澳大利亚'], canonical: '澳大利亚' },
  { aliases: ['canada', 'ca', '加拿大'], canonical: '加拿大' },
  { aliases: ['singapore', 'sg', '新加坡'], canonical: '新加坡' },
  { aliases: ['hong kong', '香港'], canonical: '中国' },
  { aliases: ['macau', 'macao', '澳门'], canonical: '中国' },
  { aliases: ['taiwan', '台湾'], canonical: '中国' },
];

export const PROVINCE_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['beijing', '北京'], canonical: '北京' },
  { aliases: ['shanghai', '上海'], canonical: '上海' },
  { aliases: ['hong kong', '香港'], canonical: '香港' },
  { aliases: ['macau', 'macao', '澳门'], canonical: '澳门' },
  { aliases: ['new york', 'ny', '纽约州', '纽约'], canonical: '纽约州' },
  { aliases: ['california', 'ca', '加州', '加利福尼亚', '加利福尼亚州'], canonical: '加利福尼亚州' },
  { aliases: ['texas', 'tx', '德州', '德克萨斯', '德克萨斯州'], canonical: '德克萨斯州' },
  { aliases: ['massachusetts', 'ma', '马萨诸塞', '马萨诸塞州'], canonical: '马萨诸塞州' },
  { aliases: ['new south wales', 'nsw', '新南威尔士', '新南威尔士州'], canonical: '新南威尔士州' },
  { aliases: ['victoria', 'vic', '维多利亚', '维多利亚州'], canonical: '维多利亚州' },
  { aliases: ['queensland', 'qld', '昆士兰', '昆士兰州'], canonical: '昆士兰州' },
  { aliases: ['ontario', 'on', '安大略', '安大略省'], canonical: '安大略省' },
];

export const CITY_ALIASES: Array<{ aliases: string[]; canonical: string }> = [
  { aliases: ['beijing', '北京'], canonical: '北京' },
  { aliases: ['shanghai', '上海'], canonical: '上海' },
  { aliases: ['hong kong', '香港'], canonical: '香港' },
  { aliases: ['rochester', '罗彻斯特'], canonical: '罗彻斯特' },
  { aliases: ['new york city', '纽约市'], canonical: '纽约' },
  { aliases: ['melbourne', '墨尔本'], canonical: '墨尔本' },
  { aliases: ['sydney', '悉尼'], canonical: '悉尼' },
  { aliases: ['brisbane', '布里斯班'], canonical: '布里斯班' },
  { aliases: ['stanford'], canonical: '斯坦福' },
  { aliases: ['boston', '波士顿'], canonical: '波士顿' },
  { aliases: ['cambridge'], canonical: '剑桥' },
];

export const UNIVERSITY_HINTS: Array<{
  aliases: string[];
  canonical: string;
  country: string;
  provinceState?: string;
  city?: string;
}> = [
  { aliases: ['peking university', '北京大学'], canonical: '北京大学', country: '中国', provinceState: '北京', city: '北京' },
  { aliases: ['tsinghua university', '清华大学'], canonical: '清华大学', country: '中国', provinceState: '北京', city: '北京' },
  { aliases: ['university of rochester', '罗彻斯特大学'], canonical: '罗彻斯特大学', country: '美国', provinceState: '纽约州', city: '罗彻斯特' },
  { aliases: ['stanford university', '斯坦福大学'], canonical: '斯坦福大学', country: '美国', provinceState: '加利福尼亚州', city: '斯坦福' },
  { aliases: ['harvard university', '哈佛大学'], canonical: '哈佛大学', country: '美国', provinceState: '马萨诸塞州', city: '剑桥' },
  { aliases: ['massachusetts institute of technology', 'mit', '麻省理工学院'], canonical: '麻省理工学院', country: '美国', provinceState: '马萨诸塞州', city: '剑桥' },
  { aliases: ['university of melbourne', '墨尔本大学'], canonical: '墨尔本大学', country: '澳大利亚', provinceState: '维多利亚州', city: '墨尔本' },
  { aliases: ['the university of melbourne'], canonical: '墨尔本大学', country: '澳大利亚', provinceState: '维多利亚州', city: '墨尔本' },
  { aliases: ['university of sydney', '悉尼大学'], canonical: '悉尼大学', country: '澳大利亚', provinceState: '新南威尔士州', city: '悉尼' },
  { aliases: ['unsw', 'university of new south wales', '新南威尔士大学'], canonical: '新南威尔士大学', country: '澳大利亚', provinceState: '新南威尔士州', city: '悉尼' },
  { aliases: ['monash university', '莫纳什大学'], canonical: '莫纳什大学', country: '澳大利亚', provinceState: '维多利亚州', city: '墨尔本' },
  { aliases: ['university of queensland', '昆士兰大学'], canonical: '昆士兰大学', country: '澳大利亚', provinceState: '昆士兰州', city: '布里斯班' },
  { aliases: ['university of toronto', '多伦多大学'], canonical: '多伦多大学', country: '加拿大', provinceState: '安大略省', city: '多伦多' },
  { aliases: ['national university of singapore', 'nus', '新加坡国立大学'], canonical: '新加坡国立大学', country: '新加坡', city: '新加坡' },
];
