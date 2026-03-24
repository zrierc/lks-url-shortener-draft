import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']

type Props = {
  data: Array<{ device_type: string; count: number }>
}

export function DeviceBreakdown({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="device_type"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={45}
        >
          {data.map((entry, index) => (
            <Cell key={entry.device_type} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
