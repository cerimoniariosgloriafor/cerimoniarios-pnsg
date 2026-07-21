export interface ReportLine {
  text: string;
  bold?: boolean;
  align?: 'left' | 'center';
}

function roleRank(role: string) {
  const order = ['M.C.', 'C.A.', 'C.L.', 'C.D.'];
  const idx = order.indexOf(role);
  return idx === -1 ? 999 : idx;
}

function sortRolesList(roles: string[] = []) {
  return [...roles].sort(
    (a, b) => roleRank(a) - roleRank(b) || a.localeCompare(b)
  );
}

function sortByRoles(a: any, b: any) {
  const rolesA = a.roles || [];
  const rolesB = b.roles || [];
  const rankA = rolesA.length ? Math.min(...rolesA.map(roleRank)) : 999;
  const rankB = rolesB.length ? Math.min(...rolesB.map(roleRank)) : 999;
  if (rankA !== rankB) return rankA - rankB;
  const nameA = a.userId?.name || '';
  const nameB = b.userId?.name || '';
  return nameA.localeCompare(nameB);
}

export const buildPrintableReport = (
  events: any[],
  startDate?: string,
  endDate?: string,
): ReportLine[] => {
  const lines: ReportLine[] = [];

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      d.setDate(d.getDate() + 1);

      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return 'N/D';
    }
  };

  lines.push({ text: 'Paróquia Nossa Senhora da Glória', bold: true, align: 'center' });
  lines.push({ text: 'RELATÓRIOS P.CERIMONIÁRIOS', bold: true, align: 'center' });
  lines.push({ text: `Coordenador Responsável: Francisco Alexandre Feijão de Freitas`, align: 'center' });
  lines.push({ text: `Vice-Coordenador: André da Silva Crippa`, align: 'center' });

  lines.push({
    text: `Período: ${startDate ? formatDate(startDate) : 'N/A'} a ${
      endDate ? formatDate(endDate) : 'N/A'
    }`,
    align: 'center',
  });

  lines.push({ text: '-'.repeat(80) });
  lines.push({ text: '' });

  events.forEach((event, index) => {
    const eventTimeLabel = event.time?.start || '—';

    const checkedInUsers = (event.users || [])
        .filter((u: any) => !!u.checkedInAt)
        .sort(sortByRoles);

    lines.push({
      text: `MISSA ${index + 1} de ${events.length}`,
      bold: true,
    });

    lines.push({ text: '='.repeat(40) });

    lines.push({
      text: `${eventTimeLabel} - ${event.locationId?.name || 'Não informado'}`,
      bold: true,
    });

    lines.push({
      text: event.title || 'Missa',
    });

    lines.push({
      text: `${event.priestName || 'Não informado'}`,
    });

    if (checkedInUsers.length > 0) {
      const availableRolesOrder = ['M.C.', 'C.A.', 'C.L.', 'C.D.'];
      checkedInUsers.forEach((u: any) => {
        if (u.roles && u.roles.length > 0) {
          const sortedRoles = [...u.roles].sort((a, b) => {
            const aIdx = availableRolesOrder.indexOf(a);
            const bIdx = availableRolesOrder.indexOf(b);
            return aIdx - bIdx;
          });
          lines.push({
            text: `${sortedRoles[0]}: ${u.userId?.name || 'Desconhecido'}`,
          });
        }
      });
    } else {
      lines.push({
        text: 'Nenhum servo com check-in.',
      });
    }

    lines.push({
      text: `Coroinhas: ${event.acolyteCount || 0}`,
    });

    const occs = (event.occurrences || []).filter(
      (o: any) => String(o.note || '').trim() !== '',
    );

    if (occs.length > 0) {
    
      lines.push({
        text: 'Intercorrências:',
      });

      occs.forEach((o: any) => {
        String(o.note)
          .split('\n')
          .forEach((line: string) => {
            lines.push({
              text: `${line.trim()}`,
            });
          });
      });
    }

    lines.push({ text: '' });
    lines.push({ text: '-'.repeat(80) });
    lines.push({ text: '' });
  });

  return lines;
};
