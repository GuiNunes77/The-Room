import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, LogOut } from "lucide-react";

interface Booking {
  id: string;
  guest_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  actual_check_out: string | null;
  total_price: number;
  status: "active" | "checked_out" | "cancelled";
  notes: string | null;
  guests: { full_name: string; document_number: string };
  rooms: { room_number: string; room_type: string };
}

interface Guest {
  id: string;
  full_name: string;
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  price_per_night: number;
  status: string;
}

const statusColors = {
  active: "bg-success",
  checked_out: "bg-muted",
  cancelled: "bg-destructive",
};

const statusLabels = {
  active: "Ativa",
  checked_out: "Finalizada",
  cancelled: "Cancelada",
};

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    guest_id: "",
    room_id: "",
    check_in_date: "",
    check_out_date: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [bookingsRes, guestsRes, roomsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, guests(full_name, document_number), rooms(room_number, room_type)")
        .order("created_at", { ascending: false }),
      supabase.from("guests").select("id, full_name"),
      supabase.from("rooms").select("id, room_number, room_type, price_per_night, status"),
    ]);

    if (bookingsRes.error) {
      toast.error("Erro ao carregar hospedagens");
    } else {
      setBookings(bookingsRes.data || []);
    }

    setGuests(guestsRes.data || []);
    setRooms(roomsRes.data || []);
    setLoading(false);
  };

  const calculateTotalPrice = (roomId: string, checkIn: string, checkOut: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room || !checkIn || !checkOut) return 0;

    const nights = Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    );
    return nights * room.price_per_night;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalPrice = calculateTotalPrice(
      formData.room_id,
      formData.check_in_date,
      formData.check_out_date
    );

    const bookingData = {
      ...formData,
      total_price: totalPrice,
      status: "active" as "active",
    };

    const { error } = await supabase.from("bookings").insert([bookingData]);

    if (error) {
      toast.error("Erro ao criar hospedagem");
    } else {
      // Update room status to occupied
      await supabase
        .from("rooms")
        .update({ status: "occupied" })
        .eq("id", formData.room_id);

      toast.success("Hospedagem criada com sucesso!");
      resetForm();
      loadData();
    }
  };

  const handleCheckOut = async (booking: Booking) => {
    if (!confirm("Deseja realizar o check-out desta hospedagem?")) return;

    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: "checked_out",
        actual_check_out: new Date().toISOString(),
      })
      .eq("id", booking.id);

    if (bookingError) {
      toast.error("Erro ao realizar check-out");
      return;
    }

    // Update room status to cleaning
    await supabase
      .from("rooms")
      .update({ status: "cleaning" })
      .eq("id", booking.room_id);

    toast.success("Check-out realizado com sucesso!");
    loadData();
  };

  const resetForm = () => {
    setFormData({
      guest_id: "",
      room_id: "",
      check_in_date: "",
      check_out_date: "",
      notes: "",
    });
    setDialogOpen(false);
  };

  const availableRooms = rooms.filter((r) => r.status === "available");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Hospedagens</h1>
            <p className="text-muted-foreground mt-1">Gerencie as hospedagens ativas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Hospedagem
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova Hospedagem</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="guest_id">Hóspede *</Label>
                  <Select
                    value={formData.guest_id}
                    onValueChange={(value) => setFormData({ ...formData, guest_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um hóspede" />
                    </SelectTrigger>
                    <SelectContent>
                      {guests.map((guest) => (
                        <SelectItem key={guest.id} value={guest.id}>
                          {guest.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room_id">Quarto *</Label>
                  <Select
                    value={formData.room_id}
                    onValueChange={(value) => setFormData({ ...formData, room_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um quarto disponível" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Quarto {room.room_number} - {room.room_type} (R$ {room.price_per_night.toFixed(2)}/noite)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="check_in_date">Check-in *</Label>
                    <Input
                      id="check_in_date"
                      type="date"
                      value={formData.check_in_date}
                      onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check_out_date">Check-out Previsto *</Label>
                    <Input
                      id="check_out_date"
                      type="date"
                      value={formData.check_out_date}
                      onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                      required
                      min={formData.check_in_date}
                    />
                  </div>
                </div>
                {formData.room_id && formData.check_in_date && formData.check_out_date && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      Valor Total: R${" "}
                      {calculateTotalPrice(
                        formData.room_id,
                        formData.check_in_date,
                        formData.check_out_date
                      ).toFixed(2)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Hospedagem</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Hospedagens</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : bookings.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma hospedagem registrada</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hóspede</TableHead>
                    <TableHead>Quarto</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.guests.full_name}</TableCell>
                      <TableCell>
                        Quarto {booking.rooms.room_number}
                        <br />
                        <span className="text-xs text-muted-foreground">{booking.rooms.room_type}</span>
                      </TableCell>
                      <TableCell>{new Date(booking.check_in_date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        {booking.actual_check_out
                          ? new Date(booking.actual_check_out).toLocaleDateString("pt-BR")
                          : new Date(booking.check_out_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="font-medium">R$ {booking.total_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[booking.status]}>
                          {statusLabels[booking.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckOut(booking)}
                          >
                            <LogOut className="w-4 h-4 mr-1" />
                            Check-out
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
