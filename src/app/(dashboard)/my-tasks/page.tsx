// src/app/(dashboard)/my-tasks/page.tsx
import { createClient } from '@/lib/supabase/server';
import { hexToHsl } from '@/lib/color';
import { listMyTasks } from './actions';
import { listMyDirectorNotes, listMyNotes } from './notesActions';
import MyTasksClient from './MyTasksClient';

const FALLBACK_COLOR = '#0d9488';

export default async function MyTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, color')
    .eq('id', user?.id ?? '')
    .single();

  /*
    التلاتة مستقلين عن بعض، فبنجيبهم بالتوازي بدل ما ننتظر كل واحد يخلص
    قبل ما يبلّش اللي بعده.
  */
  const [tasks, directorNotes, myNotes] = await Promise.all([
    listMyTasks(),
    listMyDirectorNotes(),
    listMyNotes(),
  ]);

  /*
    الاسم واللون كانوا مكتوبين يدويًا بالكومبوننت (`name="KB"`, `hue={170}`).
    اللون بيجي من `profiles.color` — نفس المصدر اللي بيلوّن العضو بكل مكان
    تاني بالمنصة (القرار المعماري #7).
  */
  const accentColor = profile?.color || FALLBACK_COLOR;
  const { hue, sat } = hexToHsl(accentColor);

// الاسم الأول فقط بترحيب الصفحة — الاسم الكامل يطلع برّا الإطار
const name = (profile?.first_name ?? '').trim() || '—';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <MyTasksClient
        initialTasks={tasks}
        initialDirectorNotes={directorNotes}
        initialMyNotes={myNotes}
        userId={user?.id ?? ''}
        name={name}
        hue={hue}
        sat={sat}
        accentColor={accentColor}
      />
    </div>
  );
}