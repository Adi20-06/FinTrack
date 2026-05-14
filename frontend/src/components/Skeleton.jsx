// Reusable skeleton loader — shows a shimmering placeholder while data loads
// Usage: <Skeleton width="100%" height={20} />

const Skeleton = ({ width = '100%', height = 16, borderRadius = 8, style = {} }) => (
  <div
    className="skeleton"
    style={{ width, height, borderRadius, ...style }}
  />
);

// Pre-built skeleton layouts for common cards
export const StatCardSkeleton = () => (
  <div className="card" style={{display:'flex',flexDirection:'column',gap:'10px'}}>
    <Skeleton width="60%" height={12}/>
    <Skeleton width="80%" height={28}/>
    <Skeleton width="40%" height={10}/>
  </div>
);

export const TableRowSkeleton = () => (
  <tr>
    {[1,2,3,4,5].map(i => (
      <td key={i} style={{padding:'12px'}}>
        <Skeleton height={14}/>
      </td>
    ))}
  </tr>
);

export const CardSkeleton = () => (
  <div className="card" style={{display:'flex',flexDirection:'column',gap:'12px'}}>
    <Skeleton width="50%" height={14}/>
    <Skeleton height={8} borderRadius={4}/>
    <div style={{display:'flex',justifyContent:'space-between'}}>
      <Skeleton width="30%" height={10}/>
      <Skeleton width="30%" height={10}/>
    </div>
  </div>
);

export default Skeleton;