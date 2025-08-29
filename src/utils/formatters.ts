// Utilitários reutilizados do projeto web

// Normalizar string para busca (remove acentos, espaços, etc)
export function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '');
}

// Parsear data no formato brasileiro
export function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Formato: dd/mm/yyyy ou yyyy-mm-dd
  const parts = dateStr.includes('/') 
    ? dateStr.split('/').reverse() // dd/mm/yyyy -> yyyy/mm/dd
    : dateStr.split('-');
  
  if (parts.length !== 3) return null;
  
  const [year, month, day] = parts.map(p => parseInt(p, 10));
  
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  return new Date(year, month - 1, day);
}

// Formatar data para exibição
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    const parsed = parseDate(date);
    if (!parsed) return date;
    date = parsed;
  }
  
  return date.toLocaleDateString('pt-BR');
}

// Formatar telefone brasileiro
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  
  if (cleaned.length === 10) {
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  
  return phone;
}

// Gerar horários disponíveis (1h em 1h das 9h às 20h)
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  
  for (let hour = 9; hour <= 20; hour++) {
    const timeString = `${hour.toString().padStart(2, '0')}:00`;
    slots.push(timeString);
  }
  
  return slots;
}

// Verificar se data está no passado
export function isDateInPast(dateStr: string): boolean {
  const date = parseDate(dateStr);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  return date < today;
}

// Verificar se horário está no passado (hoje)
export function isTimeInPast(dateStr: string, timeStr: string): boolean {
  const date = parseDate(dateStr);
  if (!date) return false;
  
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  
  if (!isToday) return false;
  
  const [hour, minute] = timeStr.split(':').map(n => parseInt(n, 10));
  const appointmentTime = new Date();
  appointmentTime.setHours(hour, minute || 0, 0, 0);
  
  return appointmentTime < today;
}
