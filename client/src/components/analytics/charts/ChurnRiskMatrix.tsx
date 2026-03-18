import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { ChurnSegment } from '../../../hooks/useDashboardData';

interface Props {
    data: ChurnSegment[];
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

export function ChurnRiskMatrix({ data }: Props) {
    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis type="number" dataKey="risk" name="Risk Score" unit="%" style={{ fontSize: '12px' }} />
                    <YAxis type="number" dataKey="count" name="Customer Count" style={{ fontSize: '12px' }} />
                    <ZAxis type="number" range={[100, 1000]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Customer Segments" data={data} fill="#6366f1">
                        {data?.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
