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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  description: string | null;
  capacity: number;
  price_per_night: number;
  status: "available" | "occupied" | "maintenance" | "cleaning";
  floor: number | null;
  amenities: string[] | null;
}

const statusColors = {
  available: "bg-success",
  occupied: "bg-destructive",
  maintenance: "bg-warning",
  cleaning: "bg-blue-500",
};

const statusLabels = {
  available: "Disponível",
  occupied: "Ocupado",
  maintenance: "Manutenção",
  cleaning: "Limpeza",
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    room_number: "",
    room_type: "",
    description: "",
    capacity: "2",
    price_per_night: "",
    status: "available",
    floor: "",
    amenities: "",
  });

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("room_number", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar quartos");
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const roomData = {
      room_number: formData.room_number,
      room_type: formData.room_type,
      description: formData.description || null,
      capacity: parseInt(formData.capacity),
      price_per_night: parseFloat(formData.price_per_night),
      status: formData.status as "available" | "occupied" | "maintenance" | "cleaning",
      floor: formData.floor ? parseInt(formData.floor) : null,
      amenities: formData.amenities ? formData.amenities.split(",").map(a => a.trim()) : null,
    };

    if (editingRoom) {
      const { error } = await supabase
        .from("rooms")
        .update(roomData)
        .eq("id", editingRoom.id);

      if (error) {
        toast.error("Erro ao atualizar quarto");
      } else {
        toast.success("Quarto atualizado com sucesso!");
        resetForm();
        loadRooms();
      }
    } else {
      const { error } = await supabase.from("rooms").insert([roomData]);

      if (error) {
        toast.error("Erro ao cadastrar quarto");
      } else {
        toast.success("Quarto cadastrado com sucesso!");
        resetForm();
        loadRooms();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este quarto?")) return;

    const { error } = await supabase.from("rooms").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir quarto");
    } else {
      toast.success("Quarto excluído com sucesso!");
      loadRooms();
    }
  };

  const resetForm = () => {
    setFormData({
      room_number: "",
      room_type: "",
      description: "",
      capacity: "2",
      price_per_night: "",
      status: "available",
      floor: "",
      amenities: "",
    });
    setEditingRoom(null);
    setDialogOpen(false);
  };

  const openEditDialog = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      room_type: room.room_type,
      description: room.description || "",
      capacity: room.capacity.toString(),
      price_per_night: room.price_per_night.toString(),
      status: room.status,
      floor: room.floor?.toString() || "",
      amenities: room.amenities?.join(", ") || "",
    });
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Quartos</h1>
            <p className="text-muted-foreground mt-1">Gerencie os quartos do hotel</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingRoom(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Quarto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRoom ? "Editar Quarto" : "Novo Quarto"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="room_number">Número do Quarto *</Label>
                    <Input
                      id="room_number"
                      value={formData.room_number}
                      onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room_type">Tipo *</Label>
                    <Input
                      id="room_type"
                      value={formData.room_type}
                      onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                      placeholder="Ex: Standard, Luxo, Suíte"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacidade *</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_per_night">Preço/Noite *</Label>
                    <Input
                      id="price_per_night"
                      type="number"
                      step="0.01"
                      value={formData.price_per_night}
                      onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                      required
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Andar</Label>
                    <Input
                      id="floor"
                      type="number"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="occupied">Ocupado</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="cleaning">Limpeza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amenities">Comodidades (separadas por vírgula)</Label>
                  <Input
                    id="amenities"
                    value={formData.amenities}
                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                    placeholder="Ex: WiFi, TV, Ar Condicionado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingRoom ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="col-span-full text-center py-8 text-muted-foreground">Carregando...</p>
          ) : rooms.length === 0 ? (
            <p className="col-span-full text-center py-8 text-muted-foreground">Nenhum quarto cadastrado</p>
          ) : (
            rooms.map((room) => (
              <Card key={room.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">Quarto {room.room_number}</CardTitle>
                      <p className="text-sm text-muted-foreground">{room.room_type}</p>
                    </div>
                    <Badge className={statusColors[room.status]}>
                      {statusLabels[room.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Capacidade:</span>
                    <span className="font-medium">{room.capacity} pessoa(s)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço/Noite:</span>
                    <span className="font-medium text-success">
                      R$ {room.price_per_night.toFixed(2)}
                    </span>
                  </div>
                  {room.floor && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Andar:</span>
                      <span className="font-medium">{room.floor}º</span>
                    </div>
                  )}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Comodidades:</p>
                      <div className="flex flex-wrap gap-1">
                        {room.amenities.map((amenity, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEditDialog(room)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(room.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
