import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Latitude e longitude são obrigatórias.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=pt-BR`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results?.[0]) {
      return NextResponse.json({ address: 'Endereço não encontrado.' });
    }

    const address = data.results[0].formatted_address;
    return NextResponse.json({ address });
  } catch (error) {
    console.error('Erro na API de Geocodificação:', error);
    return NextResponse.json({ error: 'Erro ao buscar endereço.' }, { status: 500 });
  }
}
