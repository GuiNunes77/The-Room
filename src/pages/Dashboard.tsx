import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DoorOpen, Calendar, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalGuests: 0,
    totalRooms: 0,
    availableRooms: 0,
    activeBookings: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const [guestsRes, roomsRes, availableRes, bookingsRes] = await Promise.all([
      supabase.from("guests").select("*", { count: "exact", head: true }),
      supabase.from("rooms").select("*", { count: "exact", head: true }),
      supabase.from("rooms").select("*", { count: "exact", head: true }).eq("status", "available"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "active"),
    ]);

    setStats({
      totalGuests: guestsRes.count || 0,
      totalRooms: roomsRes.count || 0,
      availableRooms: availableRes.count || 0,
      activeBookings: bookingsRes.count || 0,
    });
  };

  const statCards = [
    {
      title: "Total de Hóspedes",
      value: stats.totalGuests,
      icon: Users,
      color: "bg-blue-500",
    },
    {
      title: "Quartos Disponíveis",
      value: stats.availableRooms,
      icon: DoorOpen,
      color: "bg-success",
    },
    {
      title: "Hospedagens Ativas",
      value: stats.activeBookings,
      icon: Calendar,
      color: "bg-secondary",
    },
    {
      title: "Total de Quartos",
      value: stats.totalRooms,
      icon: TrendingUp,
      color: "bg-primary",
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de gerenciamento</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Bem-vindo ao Sistema Hoteleiro</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2">
            <p>
              Sistema completo de gerenciamento hoteleiro com funcionalidades para:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Cadastro e gestão de hóspedes</li>
              <li>Controle de quartos e disponibilidade</li>
              <li>Registro de hospedagens com check-in/check-out</li>
              <li>Relatórios e estatísticas em tempo real</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
