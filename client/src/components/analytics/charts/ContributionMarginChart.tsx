import { ResponsiveContainer, ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ProfitabilityPoint } from '../../../hooks/useDashboardData';
import { formatCurrency } from '../../../utils/currency';

interface Props {
    data: ProfitabilityPoint[];
    currency: string;
}

export function ContributionMarginChart({ data, currency }: Props) {
    return (
        <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid stroke="#f5f5f5" vertical={false} />
                    <XAxis dataKey="name" scale="band" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip
                        formatter={(value: number) => formatCurrency(value, currency)}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" fill="#eef2ff" stroke="#6366f1" name="Gross Revenue" />
                    <Bar dataKey="profit" barSize={20} fill="#10b981" name="Net Profit" />
                    <Line type="monotone" dataKey="benchmark" stroke="#9ca3af" strokeDasharray="5 5" name="Industry Benchmark" dot={false} />
                    <Line type="monotone" dataKey="margin" stroke="#f59e0b" name="Margin %" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
