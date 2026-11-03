import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { GlassPanel } from '../../ui/GlassPanel';
import { AboutCreditsModal } from '../../ui/AboutCreditsModal';

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <GlassPanel className="auth-card" style={{ maxWidth: 840, width: '92%' }}>
        <AboutCreditsModal isOpen={true} onClose={() => navigate('/')} />
        <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
          <Button onClick={() => navigate('/')}>← Kembali ke Tata Surya</Button>
        </div>
      </GlassPanel>
    </div>
  );
}
