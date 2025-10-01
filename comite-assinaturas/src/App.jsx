import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { CheckCircle2, FileText, Users, Shield, Plus, Link as LinkIcon, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import QRCode from 'qrcode'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('assinar')
  const [atas, setAtas] = useState([])
  const [assinaturas, setAssinaturas] = useState([])
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    entidade: '',
    ataId: ''
  })
  const [novaAta, setNovaAta] = useState('')
  const [codigoValidacao, setCodigoValidacao] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [adminSenha, setAdminSenha] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [ataAtual, setAtaAtual] = useState(null)

  // Senha simples para acesso admin
  const SENHA_ADMIN = 'comite2025'

  // Carregar dados do localStorage
  useEffect(() => {
    const atasSalvas = localStorage.getItem('atas')
    const assinaturasSalvas = localStorage.getItem('assinaturas')
    
    if (atasSalvas) setAtas(JSON.parse(atasSalvas))
    if (assinaturasSalvas) setAssinaturas(JSON.parse(assinaturasSalvas))
  }, [])

  // Salvar dados no localStorage
  useEffect(() => {
    localStorage.setItem('atas', JSON.stringify(atas))
  }, [atas])

  useEffect(() => {
    localStorage.setItem('assinaturas', JSON.stringify(assinaturas))
  }, [assinaturas])

  // Verificar ATA na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ataId = params.get('ata')
    if (ataId) {
      const ata = atas.find(a => a.id === ataId)
      if (ata && ata.status === 'aberta') {
        setAtaAtual(ata)
        setFormData(prev => ({ ...prev, ataId: ata.id }))
      }
    }
  }, [atas])

  const formatarCPF = (valor) => {
    const numeros = valor.replace(/\D/g, '')
    return numeros
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1')
  }

  const gerarCodigoValidacao = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  const gerarLinkAta = (ataId) => {
    return `${window.location.origin}${window.location.pathname}?ata=${ataId}`
  }

  const handleCriarAta = (e) => {
    e.preventDefault()
    if (!novaAta.trim()) {
      setMensagem('Digite o nome da ATA.')
      return
    }

    const ata = {
      id: Date.now().toString(),
      nome: novaAta,
      status: 'aberta',
      dataCriacao: new Date().toLocaleString('pt-BR')
    }

    setAtas([...atas, ata])
    setNovaAta('')
    setMensagem('ATA criada com sucesso!')
  }

  const handleToggleStatusAta = (ataId) => {
    setAtas(atas.map(ata => 
      ata.id === ataId 
        ? { ...ata, status: ata.status === 'aberta' ? 'fechada' : 'aberta' }
        : ata
    ))
  }

  const handleCopiarLink = (ataId) => {
    const link = gerarLinkAta(ataId)
    navigator.clipboard.writeText(link)
    setMensagem('Link copiado para a área de transferência!')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name === 'cpf') {
      setFormData({ ...formData, [name]: formatarCPF(value) })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAssinar = (e) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.cpf || !formData.email || !formData.entidade) {
      setMensagem('Por favor, preencha todos os campos.')
      return
    }

    if (!formData.ataId) {
      setMensagem('Selecione uma ATA para assinar.')
      return
    }

    const ataParaAssinar = atas.find(a => a.id === formData.ataId)
    
    if (!ataParaAssinar) {
      setMensagem('ATA não encontrada.')
      return
    }

    if (ataParaAssinar.status === 'fechada') {
      setMensagem('Esta ATA está fechada para assinaturas.')
      return
    }

    const codigo = gerarCodigoValidacao()
    const novaAssinatura = {
      ...formData,
      ataId: ataParaAssinar.id,
      ataNome: ataParaAssinar.nome,
      codigo,
      dataHora: new Date().toLocaleString('pt-BR'),
      id: Date.now()
    }

    setAssinaturas([...assinaturas, novaAssinatura])
    setCodigoValidacao(codigo)
    setMensagem('Assinatura registrada com sucesso!')
    
    // Manter o ataId selecionado
    const ataIdAtual = formData.ataId
    setFormData({ nome: '', cpf: '', email: '', entidade: '', ataId: ataIdAtual })
  }

  const handleValidar = (e) => {
    e.preventDefault()
    const assinatura = assinaturas.find(a => a.codigo === codigoValidacao.toUpperCase())
    
    if (assinatura) {
      setMensagem(`✓ Assinatura válida!\n\nNome: ${assinatura.nome}\nCPF: ${assinatura.cpf}\nEntidade: ${assinatura.entidade}\nATA: ${assinatura.ataNome}\nData/Hora: ${assinatura.dataHora}`)
    } else {
      setMensagem('✗ Código de validação não encontrado.')
    }
  }

  const handleLoginAdmin = (e) => {
    e.preventDefault()
    if (adminSenha === SENHA_ADMIN) {
      setAutenticado(true)
      setMensagem('Acesso autorizado!')
    } else {
      setMensagem('Senha incorreta.')
    }
  }

  const exportarCSV = (ataId = null) => {
    const assinaturasParaExportar = ataId 
      ? assinaturas.filter(a => a.ataId === ataId)
      : assinaturas

    if (assinaturasParaExportar.length === 0) {
      setMensagem('Nenhuma assinatura para exportar.')
      return
    }

    const cabecalho = 'Nome,CPF,E-mail,Entidade,ATA,Data/Hora,Código de Validação\n'
    const linhas = assinaturasParaExportar.map(a => 
      `"${a.nome}","${a.cpf}","${a.email}","${a.entidade}","${a.ataNome}","${a.dataHora}","${a.codigo}"`
    ).join('\n')
    
    const csv = cabecalho + linhas
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const nomeArquivo = ataId 
      ? `lista_presenca_${assinaturasParaExportar[0].ataNome.replace(/\s+/g, '_')}.csv`
      : `lista_presenca_${new Date().toISOString().split('T')[0]}.csv`
    
    link.setAttribute('href', url)
    link.setAttribute('download', nomeArquivo)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setMensagem('Lista de presença exportada com sucesso!')
  }

  const gerarPDF = async (ataId) => {
    const ata = atas.find(a => a.id === ataId)
    const assinaturasAta = assinaturas.filter(a => a.ataId === ataId)

    if (assinaturasAta.length === 0) {
      setMensagem('Nenhuma assinatura para gerar PDF.')
      return
    }

    const doc = new jsPDF()
    
    // Cabeçalho
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Comitê de Bacias Hidrográficas', 105, 20, { align: 'center' })
    
    doc.setFontSize(14)
    doc.text('LISTA DE PRESENÇA', 105, 30, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`${ata.nome}`, 105, 38, { align: 'center' })
    doc.text(`Data de criação: ${ata.dataCriacao}`, 105, 45, { align: 'center' })

    // Tabela de assinaturas
    const dadosTabela = assinaturasAta.map(a => [
      a.nome,
      a.cpf,
      a.email,
      a.entidade,
      a.codigo
    ])

    doc.autoTable({
      startY: 55,
      head: [['Nome', 'CPF', 'E-mail', 'Entidade', 'Código']],
      body: dadosTabela,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 30 },
        2: { cellWidth: 45 },
        3: { cellWidth: 45 },
        4: { cellWidth: 25 }
      }
    })

    // Rodapé com autenticação
    const finalY = doc.lastAutoTable.finalY + 20
    const linkValidacao = `${window.location.origin}${window.location.pathname}`
    const codigoDocumento = `ATA${ataId.substring(0, 8).toUpperCase()}`
    
    // Gerar QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(linkValidacao, { width: 200 })
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('A autenticidade deste documento pode ser conferida no site:', 20, finalY)
    doc.setTextColor(0, 0, 255)
    doc.textWithLink(linkValidacao, 20, finalY + 5, { url: linkValidacao })
    doc.setTextColor(0, 0, 0)
    doc.text(`Código do documento: ${codigoDocumento}`, 20, finalY + 10)
    doc.text(`Total de assinaturas: ${assinaturasAta.length}`, 20, finalY + 15)
    
    // Adicionar QR Code
    doc.addImage(qrCodeDataUrl, 'PNG', 160, finalY - 5, 30, 30)

    // Salvar PDF
    doc.save(`Lista_Presenca_${ata.nome.replace(/\s+/g, '_')}.pdf`)
    setMensagem('PDF gerado com sucesso!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">Sistema de Assinaturas</h1>
          </div>
          <p className="text-gray-600 text-lg">Comitê de Bacias Hidrográficas</p>
          {ataAtual && (
            <div className="mt-4 inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg">
              <p className="font-semibold">Assinando: {ataAtual.nome}</p>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="assinar" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assinar Presença
            </TabsTrigger>
            <TabsTrigger value="validar" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Validar Assinatura
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Administração
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assinar">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Registrar Presença</CardTitle>
                <CardDescription>
                  Preencha seus dados para confirmar presença na reunião
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssinar} className="space-y-4">
                  {!ataAtual && (
                    <div className="space-y-2">
                      <Label htmlFor="ataId">Selecione a ATA</Label>
                      <select
                        id="ataId"
                        name="ataId"
                        value={formData.ataId}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md"
                        required
                      >
                        <option value="">Selecione uma ATA</option>
                        {atas.filter(a => a.status === 'aberta').map(ata => (
                          <option key={ata.id} value={ata.id}>{ata.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo</Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      placeholder="Digite seu nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      placeholder="000.000.000-00"
                      maxLength="14"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entidade">Entidade/Representação</Label>
                    <Input
                      id="entidade"
                      name="entidade"
                      value={formData.entidade}
                      onChange={handleInputChange}
                      placeholder="Ex: Secretaria de Meio Ambiente"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Confirmar Presença
                  </Button>

                  {mensagem && activeTab === 'assinar' && (
                    <div className={`p-4 rounded-lg ${mensagem.includes('sucesso') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
                      <p className="font-medium">{mensagem}</p>
                      {codigoValidacao && (
                        <p className="mt-2 text-sm">
                          <strong>Código de Validação:</strong> <span className="font-mono text-lg">{codigoValidacao}</span>
                          <br />
                          <span className="text-xs">Guarde este código para validação futura</span>
                        </p>
                      )}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validar">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Validar Assinatura</CardTitle>
                <CardDescription>
                  Insira o código de validação para verificar autenticidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleValidar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código de Validação</Label>
                    <Input
                      id="codigo"
                      value={codigoValidacao}
                      onChange={(e) => setCodigoValidacao(e.target.value.toUpperCase())}
                      placeholder="Digite o código"
                      className="font-mono text-lg"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Validar Código
                  </Button>

                  {mensagem && activeTab === 'validar' && (
                    <div className={`p-4 rounded-lg whitespace-pre-line ${mensagem.includes('válida') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                      {mensagem}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admin">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Área Administrativa</CardTitle>
                <CardDescription>
                  Acesso restrito para gerenciar ATAs e visualizar assinaturas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!autenticado ? (
                  <form onSubmit={handleLoginAdmin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="senha">Senha de Administrador</Label>
                      <Input
                        id="senha"
                        type="password"
                        value={adminSenha}
                        onChange={(e) => setAdminSenha(e.target.value)}
                        placeholder="Digite a senha"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Acessar
                    </Button>
                    {mensagem && activeTab === 'admin' && !autenticado && (
                      <div className="p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
                        {mensagem}
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="space-y-6">
                    {/* Criar Nova ATA */}
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold mb-3">Criar Nova ATA</h3>
                      <form onSubmit={handleCriarAta} className="flex gap-2">
                        <Input
                          value={novaAta}
                          onChange={(e) => setNovaAta(e.target.value)}
                          placeholder="Ex: ATA 03/2025"
                          className="flex-1"
                        />
                        <Button type="submit">
                          <Plus className="w-4 h-4 mr-2" />
                          Criar ATA
                        </Button>
                      </form>
                    </div>

                    {/* Lista de ATAs */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">ATAs Criadas</h3>
                      {atas.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">Nenhuma ATA criada ainda.</p>
                      ) : (
                        <div className="space-y-3">
                          {atas.map((ata) => {
                            const assinaturasAta = assinaturas.filter(a => a.ataId === ata.id)
                            return (
                              <div key={ata.id} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-semibold text-lg">{ata.nome}</h4>
                                    <p className="text-sm text-gray-600">Criada em: {ata.dataCriacao}</p>
                                    <p className="text-sm text-gray-600">Assinaturas: {assinaturasAta.length}</p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${ata.status === 'aberta' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                                    {ata.status === 'aberta' ? 'Aberta' : 'Fechada'}
                                  </span>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCopiarLink(ata.id)}
                                  >
                                    <LinkIcon className="w-4 h-4 mr-2" />
                                    Copiar Link
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleToggleStatusAta(ata.id)}
                                  >
                                    {ata.status === 'aberta' ? 'Fechar' : 'Abrir'} ATA
                                  </Button>
                                  
                                  {assinaturasAta.length > 0 && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => exportarCSV(ata.id)}
                                      >
                                        Exportar CSV
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => gerarPDF(ata.id)}
                                      >
                                        <Download className="w-4 h-4 mr-2" />
                                        Gerar PDF
                                      </Button>
                                    </>
                                  )}
                                </div>

                                {/* Lista de assinaturas da ATA */}
                                {assinaturasAta.length > 0 && (
                                  <div className="mt-4 overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                      <thead>
                                        <tr className="bg-gray-100">
                                          <th className="border p-2 text-left">Nome</th>
                                          <th className="border p-2 text-left">CPF</th>
                                          <th className="border p-2 text-left">Entidade</th>
                                          <th className="border p-2 text-left">Data/Hora</th>
                                          <th className="border p-2 text-left">Código</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {assinaturasAta.map((assinatura) => (
                                          <tr key={assinatura.id} className="hover:bg-gray-50">
                                            <td className="border p-2">{assinatura.nome}</td>
                                            <td className="border p-2">{assinatura.cpf}</td>
                                            <td className="border p-2">{assinatura.entidade}</td>
                                            <td className="border p-2">{assinatura.dataHora}</td>
                                            <td className="border p-2 font-mono text-xs">{assinatura.codigo}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {mensagem && activeTab === 'admin' && autenticado && (
                      <div className="p-4 rounded-lg bg-green-50 text-green-800 border border-green-200">
                        {mensagem}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Sistema desenvolvido para autenticação de assinaturas digitais</p>
          <p className="mt-1">© 2025 Comitê de Bacias Hidrográficas</p>
        </div>
      </div>
    </div>
  )
}

export default App
