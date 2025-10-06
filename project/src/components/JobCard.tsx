type JobCardProps = {
  title: string;
  location: string;
  date: string;
};

export function JobCard({ title, location, date }: JobCardProps) {
  return (
    <div className="bg-white shadow-lg rounded-xl p-4 hover:shadow-xl transition">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{location}</p>
      <p className="text-sm text-gray-500">{date}</p>
    </div>
  );
}
