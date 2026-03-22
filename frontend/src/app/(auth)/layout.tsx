export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/images/brand/logo.png" alt="everapps" width={155} height={32} />
          </div>
          <p className="text-sm text-gray-500 mt-1">Requirements to Backlog, intelligently</p>
        </div>
        <div className="card p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
