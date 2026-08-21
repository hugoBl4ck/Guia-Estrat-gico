import React, { useState } from 'react';
import { User, Phone, Camera, X, CheckCircle2, Plus, Trash2, Shield } from 'lucide-react';
import { Driver } from '../types';

interface DriverRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Driver[];
  onSaveDriver: (driver: Driver) => void;
  onDeleteDriver?: (driverId: string) => void;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
];

export const DriverRegistrationModal: React.FC<DriverRegistrationModalProps> = ({
  isOpen,
  onClose,
  drivers,
  onSaveDriver,
  onDeleteDriver,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewPhoto(base64);
        setPhotoUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const newDriver: Driver = {
      id: `drv-${Date.now()}`,
      name: cleanName,
      phone: phone.trim() || undefined,
      photoUrl: photoUrl.trim() || previewPhoto || undefined,
    };

    onSaveDriver(newDriver);
    setName('');
    setPhone('');
    setPhotoUrl('');
    setPreviewPhoto(null);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-2 sm:p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-pma-card border border-white/10 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative cursor-default text-left max-h-[92dvh] sm:max-h-[88dvh] flex flex-col"
      >
        {/* Cabeçalho Fixo */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Cadastrar Novo Motorista</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Insira os dados básicos (nome, telefone e foto)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário com Corpo Rolável e Rodapé Fixo */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto overscroll-contain pr-1 py-3 space-y-4">
            {/* Foto de Perfil / Upload / Avatares */}
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-2 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400" /> Foto do Motorista
              </label>

              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                  {previewPhoto || photoUrl ? (
                    <img src={previewPhoto || photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Escolher Imagem do Dispositivo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>

                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => {
                      setPhotoUrl(e.target.value);
                      setPreviewPhoto(null);
                    }}
                    placeholder="Ou cole a URL da Foto (https://...)"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Presets de Avatares Rápidos */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] text-slate-500 font-bold">Avatares:</span>
                {DEFAULT_AVATARS.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPhotoUrl(url);
                      setPreviewPhoto(null);
                    }}
                    className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all ${
                      photoUrl === url ? 'border-emerald-400 scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Nome Completo */}
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">
                Nome do Motorista <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Hugo Vieira"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-emerald-500"
              />
            </div>

            {/* Telefone de Contato */}
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Telefone / WhatsApp (Opcional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ex: (71) 99888-7766"
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-slate-200 font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Lista de Motoristas Cadastrados */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Motoristas Cadastrados ({drivers.length})
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {drivers.map((drv) => (
                  <div key={drv.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center font-bold text-xs text-slate-300 border border-slate-700 shrink-0">
                        {drv.photoUrl ? (
                          <img src={drv.photoUrl} alt={drv.name} className="w-full h-full object-cover" />
                        ) : (
                          drv.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1">
                          {drv.name}
                        </p>
                        {drv.phone && <p className="text-[10px] text-slate-400 font-mono">{drv.phone}</p>}
                      </div>
                    </div>

                    {onDeleteDriver && drivers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteDriver(drv.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Excluir cadastro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rodapé Fixo */}
          <div className="flex gap-2 pt-3 border-t border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar Motorista
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
