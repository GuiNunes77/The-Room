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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, LogOut, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const bookingSchema = z.object({
  guest_id: z.string()
    .uuid("Selecione um hóspede válido")
    .min(1, "Hóspede é obrigatório"),
  room_id: z.string()
    .uuid("Selecione um quarto válido")
    .min(1, "Quarto é obrigatório"),
  check_in_date: z.string()
    .min(1, "Data de check-in é obrigatória"),
  check_in_time: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Horário de check-in inválido"),
  check_out_date: z.string()
    .min(1, "Data de check-out é obrigatória"),
  check_out_time: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Horário de check-out inválido"),
  notes: z.string()
    .max(1000, "Observações devem ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
});

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
    check_in_time: "14:00",
    check_out_date: "",
    check_out_time: "12:00",
    notes: "",
  });
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "checked_out">("all");

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

  const checkRoomAvailability = async (roomId: string, checkIn: string, checkOut: string) => {
    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", roomId)
      .eq("status", "active")
      .or(`and(check_in_date.lte.${checkOut},check_out_date.gte.${checkIn})`);

    if (error) {
      console.error("Error checking availability:", error);
      return false;
    }

    return data.length === 0;
  };

  const validateDates = (checkIn: string, checkOut: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate < today) {
      toast.error("A data de check-in não pode ser no passado");
      return false;
    }

    if (checkOutDate <= checkInDate) {
      toast.error("A data de check-out deve ser posterior ao check-in");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate form data with zod
      const validatedData = bookingSchema.parse(formData);

      // Validate dates
      if (!validateDates(validatedData.check_in_date, validatedData.check_out_date)) {
        return;
      }

      // Check room availability
      const isAvailable = await checkRoomAvailability(
        validatedData.room_id,
        validatedData.check_in_date,
        validatedData.check_out_date
      );

      if (!isAvailable) {
        toast.error("Este quarto já está reservado para o período selecionado");
        return;
      }

      const totalPrice = calculateTotalPrice(
        validatedData.room_id,
        validatedData.check_in_date,
        validatedData.check_out_date
      );

      const checkInDateTime = `${validatedData.check_in_date}T${validatedData.check_in_time}:00`;
      const checkOutDateTime = `${validatedData.check_out_date}T${validatedData.check_out_time}:00`;

      const bookingData = {
        guest_id: validatedData.guest_id,
        room_id: validatedData.room_id,
        check_in_date: checkInDateTime,
        check_out_date: checkOutDateTime,
        notes: validatedData.notes || null,
        total_price: totalPrice,
        status: "active" as "active",
      };

      const { error } = await supabase.from("bookings").insert([bookingData]);

      if (error) {
        toast.error("Erro ao criar hospedagem");
        console.error(error);
      } else {
        // Update room status to occupied
        await supabase
          .from("rooms")
          .update({ status: "occupied" })
          .eq("id", validatedData.room_id);

        toast.success("Hospedagem criada com sucesso!");
        resetForm();
        loadData();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        toast.error("Erro ao validar dados");
      }
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
      check_in_time: "14:00",
      check_out_date: "",
      check_out_time: "12:00",
      notes: "",
    });
    setDialogOpen(false);
  };

  const availableRooms = rooms.filter((r) => r.status === "available");

  const filteredBookings = bookings.filter((booking) => {
    if (filterStatus === "all") return true;
    return booking.status === filterStatus;
  });

  const activeBookings = bookings.filter((b) => b.status === "active");
  const today = format(new Date(), "yyyy-MM-dd");
  const todayCheckIns = activeBookings.filter((b) => b.check_in_date.startsWith(today));
  const todayCheckOuts = activeBookings.filter((b) => b.check_out_date.startsWith(today));

  const getTodayMinDate = () => {
    return format(new Date(), "yyyy-MM-dd");
  };

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
                    <Label htmlFor="check_in_date">Data Check-in *</Label>
                    <Input
                      id="check_in_date"
                      type="date"
                      value={formData.check_in_date}
                      onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                      min={getTodayMinDate()}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check_in_time">Horário Check-in *</Label>
                    <Input
                      id="check_in_time"
                      type="time"
                      value={formData.check_in_time}
                      onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="check_out_date">Data Check-out *</Label>
                    <Input
                      id="check_out_date"
                      type="date"
                      value={formData.check_out_date}
                      onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                      required
                      min={formData.check_in_date || getTodayMinDate()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check_out_time">Horário Check-out *</Label>
                    <Input
                      id="check_out_time"
                      type="time"
                      value={formData.check_out_time}
                      onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                {formData.check_in_date && formData.check_out_date && (
                  <div className="flex items-start gap-2 p-3 bg-accent/30 rounded-lg border border-accent">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-primary" />
                    <div className="text-sm">
                      <p className="font-medium">Horários padrão:</p>
                      <p className="text-muted-foreground">Check-in: 14h | Check-out: 12h</p>
                    </div>
                  </div>
                )}
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

        {/* Today's Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Hóspedes Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeBookings.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de hospedagens ativas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Check-ins Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{todayCheckIns.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Chegadas previstas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Check-outs Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{todayCheckOuts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Saídas previstas</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Hospedagens</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="active">Ativas ({activeBookings.length})</TabsTrigger>
                <TabsTrigger value="checked_out">Finalizadas</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhuma hospedagem encontrada</p>
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
                  {filteredBookings.map((booking) => {
                    const checkInDate = booking.check_in_date.split("T")[0];
                    const checkOutDate = booking.check_out_date.split("T")[0];
                    const isCheckInToday = checkInDate === today;
                    const isCheckOutToday = checkOutDate === today;

                    return (
                      <TableRow key={booking.id} className={isCheckInToday || isCheckOutToday ? "bg-accent/50" : ""}>
                        <TableCell className="font-medium">
                          {booking.guests.full_name}
                          {isCheckInToday && (
                            <Badge variant="outline" className="ml-2 text-xs bg-success/10">
                              Chegada hoje
                            </Badge>
                          )}
                          {isCheckOutToday && booking.status === "active" && (
                            <Badge variant="outline" className="ml-2 text-xs bg-warning/10">
                              Saída hoje
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          Quarto {booking.rooms.room_number}
                          <br />
                          <span className="text-xs text-muted-foreground">{booking.rooms.room_type}</span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(booking.check_in_date), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          {booking.actual_check_out
                            ? format(new Date(booking.actual_check_out), "dd/MM/yyyy HH:mm")
                            : format(new Date(booking.check_out_date), "dd/MM/yyyy HH:mm")}
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
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
