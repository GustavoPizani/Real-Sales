import React from 'react';
import { Bed, Bath, Car, Move, Heart } from 'lucide-react';

export interface PropertyCardProps {
  id: string;
  title: string;
  address: string;
  price: string;
  imageUrl: string;
  beds: number;
  baths: number;
  cars: number;
  sqm: number;
  tag?: string;
}

export default function ListingGridSection({ title, properties }: { title: string; properties: PropertyCardProps[] }) {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
            <div className="h-1 w-20 bg-rose-600 rounded-full"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((prop) => (
            <div key={prop.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all flex flex-col">
              <div className="relative aspect-[4/3] bg-gray-200">
                <img src={prop.imageUrl} alt={prop.title} className="w-full h-full object-cover" />
                {prop.tag && <span className="absolute top-4 left-4 bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full">{prop.tag}</span>}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="mb-4">
                  <p className="text-2xl font-bold text-rose-600">{prop.price}</p>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{prop.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{prop.address}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100 grid grid-cols-4 gap-2 text-center">
                   <div className="flex flex-col items-center"><Bed className="w-4 h-4 text-gray-400"/><span className="text-xs">{prop.beds}</span></div>
                   <div className="flex flex-col items-center border-l"><Bath className="w-4 h-4 text-gray-400"/><span className="text-xs">{prop.baths}</span></div>
                   <div className="flex flex-col items-center border-l"><Car className="w-4 h-4 text-gray-400"/><span className="text-xs">{prop.cars}</span></div>
                   <div className="flex flex-col items-center border-l"><Move className="w-4 h-4 text-gray-400"/><span className="text-xs">{prop.sqm}</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
