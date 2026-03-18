import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { RegionPoint } from '../../../hooks/useDashboardData';
import { formatCurrency } from '../../../utils/currency';

interface Props {
    data: RegionPoint[];
    currency: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export function RegionalPerformanceChart({ data, currency }: Props) {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '12px',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    backdropFilter: 'blur(4px)',
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#111827' }}>{label}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>
                            <span style={{ fontWeight: '600', color: '#6366f1' }}>Sales: </span>
                            {formatCurrency(payload[0].value, currency)}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>
                            <span style={{ fontWeight: '600', color: '#8b5cf6' }}>Orders: </span>
                            {payload[0].payload.orders}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="city"
                        type="category"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={100}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="sales" name="Sales" radius={[0, 8, 8, 0]} barSize={24}>
                        {data?.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.9} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
