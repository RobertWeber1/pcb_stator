# exec(open('/home/robert/.local/share/kicad/7.0/scripting/plugins/pcb_stator_generator.py').read())

import pcbnew
import math

class WindingTable:
	slot_count = 0
	pole_pitch = 0
	A = []
	B = []
	C = []

def make_winding_tabe(inner_diameter, pole_count, track_width, clearance):
	table = WindingTable()

	hole_dist = track_width + clearance;

	circumference = inner_diameter * math.pi;
	max_slot_count = math.floor(circumference / hole_dist);
	next_possinle_slot_count = math.floor(max_slot_count/(pole_count*2))*(pole_count*2);
	table.slot_count = next_possinle_slot_count

	pole_pitch = next_possinle_slot_count / pole_count;
	stride = math.floor(pole_pitch * 1.5);
	half_stride = math.ceil(stride/2);
	table.pole_pitch = pole_pitch

	print(
		"input:", max_slot_count,
		"slot_count:", next_possinle_slot_count,
		"pole_pitch:", pole_pitch,
		"stride:", stride);

	round = pole_pitch-1
	while round >=0:
		slot = round
		while slot < next_possinle_slot_count:
			last = 0;
			if (slot + 2 * stride) >= next_possinle_slot_count:
				last = 1
			table.A.append({
				"front": [
					(0 * pole_pitch + slot + 0 * half_stride) % next_possinle_slot_count,
					(0 * pole_pitch + slot + 1 * half_stride) % next_possinle_slot_count,
					(0 * pole_pitch + slot + 2 * half_stride) % next_possinle_slot_count],
				"back": [
					(0 * pole_pitch + slot + 2 * half_stride) % next_possinle_slot_count,
					(0 * pole_pitch + slot + 3 * half_stride) % next_possinle_slot_count,
					(0 * pole_pitch + slot + 4 * half_stride) % next_possinle_slot_count - last]})

			table.B.append({
				"front": [
					(1 * pole_pitch + slot + 0 * half_stride) % next_possinle_slot_count,
					(1 * pole_pitch + slot + 1 * half_stride) % next_possinle_slot_count,
					(1 * pole_pitch + slot + 2 * half_stride) % next_possinle_slot_count],
				"back": [
					(1 * pole_pitch + slot + 2 * half_stride) % next_possinle_slot_count,
					(1 * pole_pitch + slot + 3 * half_stride) % next_possinle_slot_count,
					(1 * pole_pitch + slot + 4 * half_stride) % next_possinle_slot_count - last]})

			table.C.append({
				"front": [
					(2 * pole_pitch + slot + 0 * half_stride) % next_possinle_slot_count,
					(2 * pole_pitch + slot + 1 * half_stride) % next_possinle_slot_count,
					(2 * pole_pitch + slot + 2 * half_stride) % next_possinle_slot_count],
				"back": [
					(2 * pole_pitch + slot + 2 * half_stride) % next_possinle_slot_count,
					(2 * pole_pitch + slot + 3 * half_stride) % next_possinle_slot_count,
					(2 * pole_pitch + slot + 4 * half_stride) % next_possinle_slot_count - last]})

			slot += 2*stride

		round = round - 1

	return table

def make_winding_point(arc_step_size, arc_steps, radius):
	return pcbnew.VECTOR2I(
		int(radius * math.cos(arc_steps * arc_step_size)),
		int(radius * math.sin(arc_steps * arc_step_size)))

def add_track(start, end, layer, width, group):
    board = pcbnew.GetBoard()
    track = pcbnew.PCB_TRACK(board)
    track.SetStart(start)
    track.SetEnd(end)
    track.SetWidth(width)
    track.SetLayer(layer)
    group.AddItem(track)
    board.Add(track)
    return track

def add_via(pos, hole_size, ring_size, group):
	board = pcbnew.GetBoard()
	via = pcbnew.PCB_VIA(board)
	via.SetPosition(pos)
	via.SetDrill(int(hole_size))
	via.SetWidth(int(ring_size))
	group.AddItem(via)
	board.Add(via)

def add_track_arc(start, mid, end, layer, width, group):
    board = pcbnew.GetBoard()
    track = pcbnew.PCB_ARC(board)
    track.SetStart(start)
    track.SetMid(mid)
    track.SetEnd(end)
    track.SetWidth(width)
    track.SetLayer(layer)
    board.Add(track)
    group.AddItem(track)

def add_fp_line(fp, start, end, layer, width):
	shape = pcbnew.FP_SHAPE(fp,pcbnew.FP_LINE)
	shape.SetPosition(start)
	shape.SetLayer(layer)
	shape.SetStart(start)
	shape.SetWidth(width)
	shape.SetEnd(end)
	dir(fp)
	# fp.AddItem(shape)

def generate_loop(pole_pitch, slot_count, strand, inner_diameter, magnet_width, track_width, pos, pad, group, fp):
	radius = inner_diameter / 2
	slot_step_size_rad_inner = 2 * math.pi / (slot_count)
	slot_step_size_rad_outer = 2 * math.pi / (slot_count + 1)
	layer_front = pcbnew.F_Cu
	layer_back = pcbnew.B_Cu

	outer_distance = pcbnew.FromMM(6)
	inner_distance = pcbnew.FromMM(4)

	radius1 = radius + magnet_width + outer_distance
	radius2 = radius + magnet_width
	radius3 = radius
	radius4 = radius - inner_distance
	radius5 = radius1 + 2 * track_width

	print(strand[len(strand) - 1]["back"][1])

	start_point = end_point = make_winding_point(slot_step_size_rad_outer, strand[0]["front"][0], radius5) + pos
	end_point = make_winding_point(slot_step_size_rad_outer, strand[len(strand) - 1]["back"][2], radius5) + pos

	pad.SetPosition(start_point)
	pad.SetSize(pcbnew.VECTOR2I(int(track_width), int(track_width)))
	# group.AddItem(pad)

	i = 0
	while i < len(strand):
		point11 = make_winding_point(slot_step_size_rad_outer, strand[i]["front"][0], radius1) + pos
		point12 = make_winding_point(slot_step_size_rad_inner, strand[i]["front"][1], radius2) + pos
		point13 = make_winding_point(slot_step_size_rad_inner, strand[i]["front"][1], radius3) + pos
		point14 = make_winding_point(slot_step_size_rad_inner, strand[i]["front"][2], radius4) + pos

		add_track(point12, point13, layer_front, track_width, group)
		add_track(point13, point14, layer_front, track_width, group)

		point21 = make_winding_point(slot_step_size_rad_inner, strand[i]["back"][0], radius4) + pos
		point22 = make_winding_point(slot_step_size_rad_inner, strand[i]["back"][1], radius3) + pos
		point23 = make_winding_point(slot_step_size_rad_inner, strand[i]["back"][1], radius2) + pos
		point24 = make_winding_point(slot_step_size_rad_outer, strand[i]["back"][2], radius1) + pos

		add_track(point21, point22, layer_back, track_width, group)
		add_track(point22, point23, layer_back, track_width, group)
		add_track(point23, point24, layer_back, track_width, group)

		if i != 0:
			add_via(point11, track_width*0.6, track_width, group)
			add_track(point11, point12, layer_front, track_width, group)
		else:
			# pad_track = add_track(start_point, point11, layer_front, track_width, group)
			add_fp_line(fp, point11, point12, layer_front, track_width)
			pad.DeletePrimitivesList()
			pad.AddPrimitiveSegment(pcbnew.VECTOR2I(0,0), point11-start_point, track_width)
			pad.SetShape(pcbnew.PAD_SHAPE_CUSTOM)#pad_track

		add_via(point14, track_width*0.6, track_width, group)

		if i == len(strand) - 1:
			add_track(point24, end_point, layer_back, track_width, group)

		i = i + 1

	return end_point;


def generate(inner_diameter, magnet_width, pole_count, track_width, clearance, fp):
	pos = fp.GetPosition()
	board = pcbnew.GetBoard()
	group = pcbnew.PCB_GROUP(board)

	pcbnew
	print("generate")
	print("\tInnerDiameter:", inner_diameter)
	print("\tMagnetWidth:", magnet_width)
	print("\tPoleCount:", pole_count)
	print("\tTrackWidth:", track_width)
	print("\tpos:", pos)
	print("\tclearance:", clearance)

	pad_a = fp.FindPadByNumber("1")
	pad_b = fp.FindPadByNumber("2")
	pad_c = fp.FindPadByNumber("3")

	winding_table = make_winding_tabe(inner_diameter, pole_count, track_width, clearance)
	end_a = generate_loop(
		winding_table.pole_pitch,
		winding_table.slot_count,
		winding_table.A,
		inner_diameter,
		magnet_width,
		track_width,
		pos,
		pad_a,
		group,
		fp)
	end_b = generate_loop(
		winding_table.pole_pitch,
		winding_table.slot_count,
		winding_table.B,
		inner_diameter,
		magnet_width,
		track_width,
		pos,
		pad_b,
		group,
		fp)
	end_c = generate_loop(
		winding_table.pole_pitch,
		winding_table.slot_count,
		winding_table.C,
		inner_diameter,
		magnet_width,
		track_width,
		pos,
		pad_c,
		group,
		fp)
	add_track_arc(end_a, end_b, end_c, pcbnew.B_Cu, track_width, group)

	board.Add(group)

for fp in pcbnew.GetBoard().GetFootprints():
	if fp.GetValue() == "pcb_stator":
		generate(
			pcbnew.FromMM(int(fp.GetProperties()["InnerDiameter"])),
			pcbnew.FromMM(int(fp.GetProperties()["MagnetWidth"])),
			int(fp.GetProperties()["PoleCount"]),
			pcbnew.FromMM(int(fp.GetProperties()["TrackWidth"])*0.5),
			pcbnew.FromMM(0.3),
			fp);

pcbnew.Refresh()
