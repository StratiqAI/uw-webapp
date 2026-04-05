export const DEMO_LFPR_CONFIG = {
    title: 'Labor Force Participation Rate (LFPR)',
    adultPopulation: 268.1,
    adultPopYoy: 0.6,
    laborForce: 168.1,
    laborForceYoy: 0.5,
    lfpr: 62.7,
    lfprDirection: 'down',
    trendData: [
        { year: '2020', rate: 60.2 },
        { year: '2021', rate: 61.7 },
        { year: '2022', rate: 62.4 },
        { year: '2023', rate: 63.1 },
        { year: '2024', rate: 62.7 }
    ],
    growthDrivers: [
        {
            label: 'Prime-Age Workers (25-54)',
            impact: 'high',
            description: 'Participating at 84.1%, the strongest driver of labor force growth'
        },
        {
            label: 'Immigration',
            impact: 'moderate',
            description: 'New entrants consistently joining the workforce'
        }
    ],
    dragDrivers: [
        {
            label: 'Retirements (Aging Population)',
            impact: 'high',
            description: 'Baby Boomer generation leaving the workforce at accelerating rates'
        },
        {
            label: 'Long-Term Sickness / Disability',
            impact: 'moderate',
            description: 'Structural barrier keeping a consistent segment out of the workforce'
        }
    ]
};
