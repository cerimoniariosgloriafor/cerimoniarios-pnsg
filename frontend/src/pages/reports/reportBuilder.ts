export interface ReportLine {
  text: string;
  bold?: boolean;
}

function roleRank(role: string) {
  const order = ['M.C.', 'C.A.', 'C.L.'];
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

  lines.push({ text: 'Relatório de Missas', bold: true });
  lines.push({
    text: `Período: ${startDate ? formatDate(startDate) : 'N/A'} a ${
      endDate ? formatDate(endDate) : 'N/A'
    }`,
  });
  lines.push({ text: `Total de missas: ${events.length}` });
  lines.push({
    text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
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

    // TÍTULO EM NEGRITO
    lines.push({
      text: event.title || 'Missa',
      bold: true,
    });

    lines.push({
      text: `Local: ${
        event.locationId?.name || 'Não informado'
      } - ${eventTimeLabel}`,
    });

    lines.push({
      text: `Padre: ${event.priestName || 'Não informado'}`,
    });

    lines.push({
      text: `Acólitos: ${event.acolyteCount || 0}`,
    });

    lines.push({ text: '' });

    lines.push({
      text: 'Servos:',
      bold: true,
    });

    if (checkedInUsers.length > 0) {
      checkedInUsers.forEach((u: any) => {
        const roles =
          sortRolesList(u.roles || []).join(', ') || 'Sem função';

        lines.push({
          text: `• ${u.userId?.name || 'Desconhecido'} (${roles})`,
        });
      });
    } else {
      lines.push({
        text: 'Nenhum servo com check-in.',
      });
    }

    const occs = (event.occurrences || []).filter(
      (o: any) => String(o.note || '').trim() !== '',
    );

    if (occs.length > 0) {
    lines.push({ text: '' });
    
      lines.push({
        text: 'Intercorrências Registradas:',
        bold: true,
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