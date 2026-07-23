begin;

create type public.curriculum_descriptor_level as enum ('basico', 'intermediario', 'avancado');

create table public.curriculum_catalogs (
  id uuid primary key,
  code text not null unique,
  title text not null,
  course_name text not null,
  source_kind text not null check (source_kind in ('official', 'internal_curated')),
  source_reference text not null,
  source_sha256 text not null check (source_sha256 ~ '^[A-F0-9]{64}$'),
  version_date date not null,
  created_at timestamptz not null default now()
);

create table public.curriculum_competencies (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.curriculum_catalogs(id) on delete cascade,
  code text not null check (code ~ '^C[0-9]{2}$'),
  description text not null check (char_length(btrim(description)) >= 20),
  unique (catalog_id, code)
);

create table public.curriculum_components (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.curriculum_catalogs(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  unique (catalog_id, name)
);

create table public.curriculum_descriptors (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.curriculum_catalogs(id) on delete cascade,
  competency_id uuid not null references public.curriculum_competencies(id) on delete restrict,
  code text not null check (code ~ '^D[0-9]{2}$'),
  level public.curriculum_descriptor_level not null,
  description text not null check (char_length(btrim(description)) >= 20),
  unique (catalog_id, code)
);

create table public.curriculum_component_descriptors (
  component_id uuid not null references public.curriculum_components(id) on delete cascade,
  descriptor_id uuid not null references public.curriculum_descriptors(id) on delete cascade,
  primary key (component_id, descriptor_id)
);

create table public.class_curriculum_components (
  class_id uuid not null references public.classes(id) on delete cascade,
  component_id uuid not null references public.curriculum_components(id) on delete restrict,
  linked_at timestamptz not null default now(),
  primary key (class_id, component_id)
);

alter table public.curriculum_catalogs enable row level security;
alter table public.curriculum_competencies enable row level security;
alter table public.curriculum_components enable row level security;
alter table public.curriculum_descriptors enable row level security;
alter table public.curriculum_component_descriptors enable row level security;
alter table public.class_curriculum_components enable row level security;

create policy curriculum_catalogs_read on public.curriculum_catalogs
for select to authenticated using (true);
create policy curriculum_competencies_read on public.curriculum_competencies
for select to authenticated using (true);
create policy curriculum_components_read on public.curriculum_components
for select to authenticated using (true);
create policy curriculum_descriptors_read on public.curriculum_descriptors
for select to authenticated using (true);
create policy curriculum_component_descriptors_read on public.curriculum_component_descriptors
for select to authenticated using (true);
create policy class_curriculum_read_related on public.class_curriculum_components
for select to authenticated using (
  (select public.owns_class(class_id))
  or (select public.is_active_class_member(class_id))
  or (select public.is_master_aal2())
);
create policy class_curriculum_manage_owner on public.class_curriculum_components
for all to authenticated
using ((select public.owns_class(class_id)) or (select public.is_master_aal2()))
with check ((select public.owns_class(class_id)) or (select public.is_master_aal2()));

revoke all on public.curriculum_catalogs, public.curriculum_competencies,
  public.curriculum_components, public.curriculum_descriptors,
  public.curriculum_component_descriptors, public.class_curriculum_components
  from anon, authenticated;
grant select on public.curriculum_catalogs, public.curriculum_competencies,
  public.curriculum_components, public.curriculum_descriptors,
  public.curriculum_component_descriptors to authenticated;
grant select, insert, update, delete on public.class_curriculum_components to authenticated;

insert into public.curriculum_catalogs (
  id, code, title, course_name, source_kind, source_reference, source_sha256, version_date
) values (
  'a1000000-0000-0000-0000-000000000001',
  'SIDEP-CE-TI-2026',
  'Componentes, Competências e Descritores',
  'Técnico em Informática',
  'internal_curated',
  'Arquivo fornecido pelo Product Owner, baseado na ementa do curso; vínculo documental da ementa oficial pendente.',
  '8065FBBBCAF9E1317753C53F3DA9EF14C15DC30279061000B4694AD99343D7E9',
  '2026-07-22'
);

insert into public.curriculum_competencies (catalog_id, code, description) values
('a1000000-0000-0000-0000-000000000001','C01','Operar recursos computacionais, sistemas operacionais e práticas de segurança digital para uso responsável da tecnologia.'),
('a1000000-0000-0000-0000-000000000001','C02','Resolver problemas computacionais por meio de lógica de programação, algoritmos, programação estruturada e orientação a objetos.'),
('a1000000-0000-0000-0000-000000000001','C03','Realizar diagnóstico, montagem, configuração, manutenção e suporte em computadores, periféricos e ambientes de hardware.'),
('a1000000-0000-0000-0000-000000000001','C04','Desenvolver interfaces, páginas e aplicações web com estrutura semântica, estilo, interação, usabilidade e integração com dados.'),
('a1000000-0000-0000-0000-000000000001','C05','Modelar, implementar e consultar bancos de dados, aplicando organização, persistência, integridade e recuperação de informações.'),
('a1000000-0000-0000-0000-000000000001','C06','Compreender, configurar e diagnosticar redes de computadores, serviços de conectividade, endereçamento e compartilhamento de recursos.'),
('a1000000-0000-0000-0000-000000000001','C07','Aplicar tecnologias emergentes, robótica e inteligência artificial em soluções técnicas contextualizadas e eticamente orientadas.'),
('a1000000-0000-0000-0000-000000000001','C08','Produzir artefatos digitais, interfaces e conteúdos visuais com princípios de design, composição, acessibilidade e comunicação.'),
('a1000000-0000-0000-0000-000000000001','C09','Integrar conhecimentos técnicos em laboratórios, projetos integradores e práticas profissionais, documentando soluções e resultados.'),
('a1000000-0000-0000-0000-000000000001','C10','Planejar carreira, estágio, organização do trabalho, empreendedorismo e inovação em contextos produtivos e sociais da informática.');

insert into public.curriculum_components (catalog_id, name) values
('a1000000-0000-0000-0000-000000000001','Arquitetura e Manutenção de Computadores'),
('a1000000-0000-0000-0000-000000000001','Banco de Dados'),
('a1000000-0000-0000-0000-000000000001','Design Gráfico'),
('a1000000-0000-0000-0000-000000000001','Gerenciador de Conteúdo'),
('a1000000-0000-0000-0000-000000000001','Gestão de Startup'),
('a1000000-0000-0000-0000-000000000001','HTML/CSS'),
('a1000000-0000-0000-0000-000000000001','Informática Básica'),
('a1000000-0000-0000-0000-000000000001','Inteligência Artificial Aplicada'),
('a1000000-0000-0000-0000-000000000001','Introdução à Inteligência Artificial'),
('a1000000-0000-0000-0000-000000000001','Laboratório de Hardware'),
('a1000000-0000-0000-0000-000000000001','Laboratório de Software'),
('a1000000-0000-0000-0000-000000000001','Lógica de Programação'),
('a1000000-0000-0000-0000-000000000001','Lógica de Programação I (Python)'),
('a1000000-0000-0000-0000-000000000001','Lógica de Programação II'),
('a1000000-0000-0000-0000-000000000001','Noções de Robótica'),
('a1000000-0000-0000-0000-000000000001','Organização do Trabalho e Técnicas Produtivas'),
('a1000000-0000-0000-0000-000000000001','Planejamento de Carreira'),
('a1000000-0000-0000-0000-000000000001','Programação Orientada a Objetos'),
('a1000000-0000-0000-0000-000000000001','Programação Web'),
('a1000000-0000-0000-0000-000000000001','Projeto Integrador'),
('a1000000-0000-0000-0000-000000000001','Rede de Computadores'),
('a1000000-0000-0000-0000-000000000001','Sistemas Operacionais');

with descriptor_data(code, competency_code, level, description) as (values
('D01','C01','basico','Utilizar recursos básicos de computadores, aplicativos, internet e ferramentas de produtividade em situações escolares, profissionais e comunitárias.'),
('D02','C01','basico','Distinguir hardware, software, periféricos, arquivos, pastas e recursos de armazenamento local ou em nuvem.'),
('D03','C01','basico','Aplicar práticas de segurança da informação, cidadania digital, proteção de dados, senhas e uso responsável da internet.'),
('D04','C01','intermediario','Reconhecer funções de sistemas operacionais, gerenciamento de arquivos, usuários, permissões, processos e recursos do sistema.'),
('D05','C02','basico','Decompor problemas em etapas, identificar entradas, processamentos e saídas e representar soluções por algoritmos ou pseudocódigo.'),
('D06','C02','basico','Interpretar variáveis, tipos de dados, operadores, entrada, saída e conversões em programas simples.'),
('D07','C02','basico','Analisar estruturas condicionais, estruturas de repetição e fluxo de execução em algoritmos e programas.'),
('D08','C02','intermediario','Aplicar listas, funções, modularização, validação de dados e combinação de estruturas na solução de problemas.'),
('D09','C02','intermediario','Reconhecer classes, objetos, atributos, métodos, encapsulamento e relações básicas da programação orientada a objetos.'),
('D10','C02','intermediario','Depurar erros, prever saídas, testar comportamentos e justificar decisões em programas estruturados ou orientados a objetos.'),
('D11','C03','basico','Identificar componentes internos, periféricos, funções de hardware e relações entre peças do computador.'),
('D12','C03','intermediario','Executar procedimentos de montagem, configuração inicial, instalação e verificação de equipamentos computacionais.'),
('D13','C03','intermediario','Diagnosticar sintomas de falhas, lentidão, superaquecimento e propor manutenção preventiva ou corretiva.'),
('D14','C03','avancado','Aplicar normas de segurança, organização de bancada, registro técnico e qualidade em atividades práticas de hardware.'),
('D15','C04','basico','Reconhecer estrutura semântica de páginas HTML, elementos, atributos, links, imagens e organização do conteúdo.'),
('D16','C04','intermediario','Aplicar seletores, propriedades CSS, cores, responsividade, layout e estilização visual de interfaces web.'),
('D17','C04','intermediario','Implementar interações, validações e comportamentos básicos em páginas e aplicações web.'),
('D18','C04','intermediario','Organizar, publicar e manter conteúdos em plataformas digitais, sites, blogs ou sistemas de gerenciamento de conteúdo.'),
('D19','C04','avancado','Integrar interface web, lógica de aplicação e persistência de dados em soluções simples voltadas a demandas reais.'),
('D20','C05','basico','Modelar entidades, atributos, relacionamentos e cardinalidades para representar problemas contextualizados.'),
('D21','C05','intermediario','Definir tabelas, campos, chaves primárias, chaves estrangeiras e regras básicas de integridade.'),
('D22','C05','intermediario','Interpretar e escrever comandos SQL básicos para inserir, consultar, atualizar e excluir dados.'),
('D23','C05','avancado','Aplicar práticas de organização, backup, segurança, consistência e recuperação de informações em bancos de dados.'),
('D24','C06','basico','Identificar topologias, equipamentos, meios de transmissão e funções básicas em redes de computadores.'),
('D25','C06','intermediario','Configurar endereçamento, conectividade, compartilhamento de recursos e serviços básicos de rede.'),
('D26','C06','intermediario','Diagnosticar problemas de conectividade, desempenho, acesso e segurança em ambientes de rede.'),
('D27','C06','avancado','Planejar soluções simples de rede para escola, comunidade, associação, cooperativa ou pequeno empreendimento.'),
('D28','C07','basico','Reconhecer sensores, atuadores, placas, comandos e princípios de automação aplicados a protótipos.'),
('D29','C07','intermediario','Aplicar lógica de programação em protótipos de robótica, automação ou monitoramento de situações do território.'),
('D30','C07','basico','Compreender conceitos básicos de inteligência artificial, dados, automação, aprendizagem de máquina e IA generativa.'),
('D31','C07','intermediario','Avaliar usos éticos, limites, riscos e possibilidades da IA em projetos técnicos, educacionais, produtivos e comunitários.'),
('D32','C08','basico','Aplicar princípios de composição visual, cor, tipografia, alinhamento, contraste e hierarquia da informação.'),
('D33','C08','intermediario','Selecionar formatos, ferramentas e procedimentos adequados para produção, edição e exportação de artefatos digitais.'),
('D34','C08','intermediario','Produzir materiais digitais acessíveis e comunicativos para escola, comunidade, movimentos, redes sociais ou projetos.'),
('D35','C09','intermediario','Levantar necessidades reais, definir requisitos e propor soluções tecnológicas contextualizadas para escola ou comunidade.'),
('D36','C09','avancado','Planejar, prototipar, testar, documentar e apresentar soluções de software em projetos integradores.'),
('D37','C09','avancado','Executar práticas laboratoriais de hardware ou infraestrutura com registro técnico, segurança, colaboração e qualidade.'),
('D38','C10','basico','Relacionar organização do trabalho, técnicas produtivas, colaboração, responsabilidade e comunicação profissional.'),
('D39','C10','intermediario','Planejar carreira, estágio, portfólio, postura profissional e estratégias de inserção no mundo do trabalho.'),
('D40','C10','intermediario','Elaborar propostas de inovação, empreendedorismo, gestão de startup e soluções digitais com impacto social ou produtivo.')
)
insert into public.curriculum_descriptors (catalog_id, competency_id, code, level, description)
select
  'a1000000-0000-0000-0000-000000000001',
  competency.id,
  descriptor_data.code,
  descriptor_data.level::public.curriculum_descriptor_level,
  descriptor_data.description
from descriptor_data
join public.curriculum_competencies competency
  on competency.catalog_id = 'a1000000-0000-0000-0000-000000000001'
 and competency.code = descriptor_data.competency_code;

with component_descriptor(component_name, descriptor_code) as (values
('Arquitetura e Manutenção de Computadores','D11'),('Arquitetura e Manutenção de Computadores','D12'),
('Banco de Dados','D20'),('Banco de Dados','D21'),('Banco de Dados','D22'),('Banco de Dados','D23'),
('Design Gráfico','D32'),('Design Gráfico','D33'),('Design Gráfico','D34'),
('Gerenciador de Conteúdo','D18'),('Gestão de Startup','D40'),
('HTML/CSS','D15'),('HTML/CSS','D16'),
('Informática Básica','D01'),('Informática Básica','D02'),('Informática Básica','D03'),
('Inteligência Artificial Aplicada','D31'),('Introdução à Inteligência Artificial','D30'),
('Laboratório de Hardware','D13'),('Laboratório de Hardware','D14'),('Laboratório de Hardware','D37'),
('Laboratório de Software','D36'),('Lógica de Programação','D05'),
('Lógica de Programação I (Python)','D06'),('Lógica de Programação I (Python)','D07'),
('Lógica de Programação II','D08'),('Noções de Robótica','D28'),('Noções de Robótica','D29'),
('Organização do Trabalho e Técnicas Produtivas','D38'),('Planejamento de Carreira','D39'),
('Programação Orientada a Objetos','D09'),('Programação Orientada a Objetos','D10'),
('Programação Web','D17'),('Programação Web','D19'),('Projeto Integrador','D35'),
('Rede de Computadores','D24'),('Rede de Computadores','D25'),('Rede de Computadores','D26'),('Rede de Computadores','D27'),
('Sistemas Operacionais','D04')
)
insert into public.curriculum_component_descriptors (component_id, descriptor_id)
select component.id, descriptor.id
from component_descriptor
join public.curriculum_components component
  on component.catalog_id = 'a1000000-0000-0000-0000-000000000001'
 and component.name = component_descriptor.component_name
join public.curriculum_descriptors descriptor
  on descriptor.catalog_id = 'a1000000-0000-0000-0000-000000000001'
 and descriptor.code = component_descriptor.descriptor_code;

drop function public.create_class(text, text, public.grade_year);

create or replace function public.create_class(
  p_name text,
  p_theme text default null,
  p_grade_year public.grade_year default 'any',
  p_curriculum_component_id uuid default null
)
returns public.classes
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role := public.current_profile_role();
  normalized_name text := btrim(p_name);
  normalized_theme text := nullif(btrim(p_theme), '');
  generated_code text;
  created_class public.classes%rowtype;
  attempt integer := 0;
begin
  if actor_id is null or not (
    actor_role = 'teacher'
    or (actor_role = 'master' and public.is_master_aal2())
  ) then
    raise exception using errcode = '42501', message = 'Apenas professor ativo ou master com MFA pode criar turma';
  end if;
  if char_length(normalized_name) not between 2 and 120 then
    raise exception using errcode = '22023', message = 'Nome da turma deve ter entre 2 e 120 caracteres';
  end if;
  if p_curriculum_component_id is not null and not exists (
    select 1 from public.curriculum_components where id = p_curriculum_component_id
  ) then
    raise exception using errcode = '22023', message = 'Componente curricular inválido';
  end if;

  loop
    attempt := attempt + 1;
    generated_code := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    begin
      insert into public.classes (name, code, theme, grade_year, teacher_id)
      values (normalized_name, generated_code, normalized_theme, p_grade_year, actor_id)
      returning * into created_class;
      exit;
    exception when unique_violation then
      if attempt >= 5 then raise; end if;
    end;
  end loop;

  if p_curriculum_component_id is not null then
    insert into public.class_curriculum_components (class_id, component_id)
    values (created_class.id, p_curriculum_component_id);
  end if;

  insert into public.audit_events (
    actor_id, actor_role, action, resource_type, resource_id, outcome, metadata
  ) values (
    actor_id, actor_role, 'class.created', 'class', created_class.id, 'success',
    jsonb_build_object(
      'gradeYear', created_class.grade_year,
      'hasTheme', created_class.theme is not null,
      'curriculumComponentId', p_curriculum_component_id
    )
  );
  return created_class;
end;
$$;

revoke all on function public.create_class(text, text, public.grade_year, uuid) from public, anon;
grant execute on function public.create_class(text, text, public.grade_year, uuid) to authenticated;

commit;
