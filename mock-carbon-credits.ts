// Mock Carbon Credits Exchange Connector
// This demonstrates integration with carbon credit trading platforms

export const name = 'mock-carbon-credits';

export async function fetchAndNormalize(token: string | null, criteria: any): Promise<any[]> {
  // Simulate API delay for carbon credit verification
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));
  
  // Mock carbon credit data for South African regions
  const mockData = [
    {
      id: 'carbon-001',
      title: 'Verified Carbon Credits - Reforestation Project',
      category: 'carbon',
      commodityType: 'carbon',
      quantity: 500,
      unit: 'tCO2e',
      pricePerUnit: 85.00,
      currency: 'ZAR',
      location: 'Eastern Cape, South Africa',
      region: 'EC',
      latitude: -32.2968,
      longitude: 26.4194,
      supplier: 'SA Carbon Solutions',
      quality: 'VCS Verified',
      certifications: ['VCS', 'Gold Standard', 'UNFCCC'],
      description: 'High-quality carbon credits from indigenous tree reforestation in Eastern Cape.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 92,
      socialImpactCategory: 'Environmental',
      projectType: 'Reforestation',
      vintage: '2024',
      isVerified: true,
      verificationBody: 'Verra',
      source: 'mock-carbon-credits'
    },
    {
      id: 'carbon-002',
      title: 'Agricultural Carbon Offsets - Regenerative Farming',
      category: 'carbon',
      commodityType: 'carbon',
      quantity: 250,
      unit: 'tCO2e',
      pricePerUnit: 75.50,
      currency: 'ZAR',
      location: 'Western Cape, South Africa',
      region: 'WC',
      latitude: -33.9249,
      longitude: 18.4241,
      supplier: 'Cape Agriculture Carbon',
      quality: 'Gold Standard',
      certifications: ['Gold Standard', 'CAR'],
      description: 'Carbon credits from regenerative agriculture practices in wine country.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 88,
      socialImpactCategory: 'Environmental',
      projectType: 'Agriculture',
      vintage: '2024',
      isVerified: true,
      verificationBody: 'Gold Standard',
      source: 'mock-carbon-credits'
    },
    {
      id: 'carbon-003',
      title: 'Renewable Energy Carbon Credits - Solar Farm',
      category: 'carbon',
      commodityType: 'carbon',
      quantity: 1000,
      unit: 'tCO2e',
      pricePerUnit: 65.00,
      currency: 'ZAR',
      location: 'Northern Cape, South Africa',
      region: 'NC',
      latitude: -28.7500,
      longitude: 24.7500,
      supplier: 'Kalahari Solar Credits',
      quality: 'CDM Certified',
      certifications: ['CDM', 'UNFCCC'],
      description: 'Carbon credits generated from large-scale solar energy projects.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 85,
      socialImpactCategory: 'Environmental',
      projectType: 'Renewable Energy',
      vintage: '2024',
      isVerified: true,
      verificationBody: 'UNFCCC',
      source: 'mock-carbon-credits'
    },
    {
      id: 'carbon-004',
      title: 'Community Forestry Carbon Project',
      category: 'carbon',
      commodityType: 'carbon',
      quantity: 150,
      unit: 'tCO2e',
      pricePerUnit: 95.00,
      currency: 'ZAR',
      location: 'Eastern Cape, South Africa',
      region: 'EC',
      latitude: -31.5532,
      longitude: 28.7870,
      supplier: 'Transkei Community Carbon',
      quality: 'VCS + CCBS',
      certifications: ['VCS', 'CCBS', 'Fair Trade'],
      description: 'Community-managed forest conservation generating premium carbon credits.',
      availableFrom: new Date().toISOString(),
      socialImpactScore: 96,
      socialImpactCategory: 'Environmental',
      projectType: 'Community Forestry',
      vintage: '2024',
      isVerified: true,
      verificationBody: 'Verra',
      source: 'mock-carbon-credits'
    }
  ];

  // Filter based on criteria
  let filtered = mockData;
  
  if (criteria.commodityType) {
    filtered = filtered.filter(item => 
      item.commodityType.toLowerCase().includes(criteria.commodityType.toLowerCase())
    );
  }
  
  if (criteria.region) {
    filtered = filtered.filter(item =>
      item.region.toLowerCase() === criteria.region.toLowerCase()
    );
  }
  
  if (criteria.quantity) {
    filtered = filtered.filter(item => item.quantity >= criteria.quantity);
  }
  
  if (criteria.maxPrice) {
    filtered = filtered.filter(item => item.pricePerUnit <= criteria.maxPrice);
  }

  if (criteria.projectType) {
    filtered = filtered.filter(item =>
      item.projectType.toLowerCase().includes(criteria.projectType.toLowerCase())
    );
  }

  return filtered;
}