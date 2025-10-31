import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";

const guestSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  document_number: z.string()
    .trim()
    .min(5, "Documento deve ter no mínimo 5 caracteres")
    .max(20, "Documento deve ter no máximo 20 caracteres"),
  email: z.string()
    .trim()
    .email("Email inválido")
    .max(255, "Email deve ter no máximo 255 caracteres")
    .optional()
    .or(z.literal("")),
  phone: z.string()
    .trim()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional()
    .or(z.literal("")),
  address: z.string()
    .trim()
    .max(500, "Endereço deve ter no máximo 500 caracteres")
    .optional()
    .or(z.literal("")),
  notes: z.string()
    .max(1000, "Observações devem ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
});

interface Guest {
  id: string;
  full_name: string;
  document_number: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export default function Guests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    document_number: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar hóspedes");
    } else {
      setGuests(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    try {
      const validatedData = guestSchema.parse(formData);
      
      // Clean empty strings for optional fields
      const cleanData = {
        ...validatedData,
        email: validatedData.email || null,
        phone: validatedData.phone || null,
        address: validatedData.address || null,
        notes: validatedData.notes || null,
      };

      if (editingGuest) {
        const { error } = await supabase
          .from("guests")
          .update(cleanData as any)
          .eq("id", editingGuest.id);

        if (error) {
          toast.error("Erro ao atualizar hóspede");
        } else {
          toast.success("Hóspede atualizado com sucesso!");
          resetForm();
          loadGuests();
        }
      } else {
        const { error } = await supabase.from("guests").insert([cleanData as any]);

        if (error) {
          toast.error("Erro ao cadastrar hóspede");
        } else {
          toast.success("Hóspede cadastrado com sucesso!");
          resetForm();
          loadGuests();
        }
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

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este hóspede?")) return;

    const { error } = await supabase.from("guests").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir hóspede");
    } else {
      toast.success("Hóspede excluído com sucesso!");
      loadGuests();
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      document_number: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    });
    setEditingGuest(null);
    setDialogOpen(false);
  };

  const openEditDialog = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({
      full_name: guest.full_name,
      document_number: guest.document_number,
      email: guest.email || "",
      phone: guest.phone || "",
      address: guest.address || "",
      notes: guest.notes || "",
    });
    setDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Hóspedes</h1>
            <p className="text-muted-foreground mt-1">Gerencie os hóspedes cadastrados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingGuest(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Hóspede
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGuest ? "Editar Hóspede" : "Novo Hóspede"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document_number">CPF/Documento *</Label>
                    <Input
                      id="document_number"
                      value={formData.document_number}
                      onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
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
                  <Button type="submit">
                    {editingGuest ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Hóspedes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : guests.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum hóspede cadastrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.full_name}</TableCell>
                      <TableCell>{guest.document_number}</TableCell>
                      <TableCell>{guest.email || "-"}</TableCell>
                      <TableCell>{guest.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(guest)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(guest.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
