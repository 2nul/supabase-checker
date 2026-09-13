import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { supabaseUrl, supabaseKey, tableNames } = await request.json();

    if (!supabaseUrl || !supabaseKey || !tableNames || tableNames.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const result: Record<string, any[]> = {};

    for (const tableName of tableNames) {
      const { data, error } = await supabase.from(tableName).select('*');

      if (error) {
        return NextResponse.json({ error: `Error fetching table ${tableName}: ${error.message}` }, { status: 500 });
      }

      result[tableName] = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}