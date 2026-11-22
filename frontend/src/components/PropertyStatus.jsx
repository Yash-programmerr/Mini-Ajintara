const styles = {
  pending: 'bg-amber-100 text-amber-900', approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-800',
};
export default function PropertyStatus({ status }) {
  return <span className={'inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ' + styles[status]}>
    {status}
  </span>;
}
