import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { MarketingChannel } from '../../../hooks/useDashboardData';

interface Props {
    data: MarketingChannel[];
}

export function MarketingMixChart({ data }: Props) {
    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="channel" style={{ fontSize: '12px' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} style={{ fontSize: '10px' }} />
                    <Radar
                        name="Benchmark"
                        dataKey="benchmark"
                        stroke="#9ca3af"
                        fill="#9ca3af"
                        fillOpacity={0.2}
                    />
                    <Radar
                        name="Actual ROAS"
                        dataKey="roas"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.6}
                    />
                    <Tooltip />
                    <Legend />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
