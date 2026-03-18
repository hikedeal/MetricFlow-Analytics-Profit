import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { LTVPoint } from '../../../hooks/useDashboardData';
import { formatCurrency } from '../../../utils/currency';

interface Props {
    data: LTVPoint[];
    currency: string;
}

export function LTVPredictionChart({ data, currency }: Props) {
    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip
                        formatter={(value: number) => formatCurrency(value, currency)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#764ba2"
                        strokeWidth={3}
                        dot={{ r: 6, fill: '#764ba2', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8 }}
                        name="Predicted LTV"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
