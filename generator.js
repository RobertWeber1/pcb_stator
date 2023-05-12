var global_name = "";

function set_name(value)
{
	console.log("new name is: ", value);
	global_name = value;
}

function generate()
{
	if(global_name == "")
	{
		document.getElementById("name").value = "stator";
	}
	else
	{
		name = global_name;
	}

	const settings = {
		name:           name,
		layer1:         document.getElementById("layer1").value,
		layer2:         document.getElementById("layer2").value,
		inner_diameter: document.getElementById("inner_diameter").valueAsNumber,
		magnet_width:   document.getElementById("magnet_width").valueAsNumber,
		pole_count:     document.getElementById("pole_count").valueAsNumber,
		via_hole_size:  document.getElementById("via_hole_size").valueAsNumber,
		via_ring_size:  document.getElementById("via_ring_size").valueAsNumber,
		via_distance:   document.getElementById("via_distance").valueAsNumber,
		track_width:    document.getElementById("track_width").valueAsNumber,
		inner_distance: document.getElementById("inner_distance").valueAsNumber,
		outer_distance: document.getElementById("outer_distance").valueAsNumber
	};

	console.log("track_width:", settings.track_width);

	const pattern = generate_pattern(settings);

	draw_pattern(pattern);

	make_footprint(pattern);

}

function make_winding_table(input)
{
	const width = Math.max((input.via_hole_size + input.via_ring_size), input.track_width);
	const hole_dist = 2*width+input.via_distance;

	const circumference = input.inner_diameter * Math.PI;
	const max_slot_count = Math.floor(circumference / hole_dist);

	const next_possinle_slot_count = Math.floor(max_slot_count/(input.pole_count*2))*(input.pole_count*2);
	const pole_pitch = next_possinle_slot_count / input.pole_count;

	var result = {
		slot_clount: next_possinle_slot_count,
		pitch: pole_pitch,
		A:[], B:[], C:[]};

	const stride = Math.round(pole_pitch * 1.5);

	console.log(
		"input:", max_slot_count,
		"count:", next_possinle_slot_count,
		"pole_pitch:", pole_pitch,
		"stride:", stride);

	input.modulus = next_possinle_slot_count / stride;

	const half_stride = Math.floor(stride/2);

	for(var round = pole_pitch-1; round >=0; round--)
	{
		for(var slot = round; slot < next_possinle_slot_count; slot += 2*stride)
		{
			const last = (slot + 2*stride >= next_possinle_slot_count) ? 1 : 0;
			result['A'].push({
				front: [
					(slot+0*half_stride)%next_possinle_slot_count,
					(slot+1*half_stride)%next_possinle_slot_count,
					(slot+2*half_stride)%next_possinle_slot_count],
				back: [
					(slot+2*half_stride)%next_possinle_slot_count,
					(slot+3*half_stride)%next_possinle_slot_count,
					(slot+4*half_stride)%next_possinle_slot_count - last]});

			result['B'].push({
				front: [
					(pole_pitch + slot+0*half_stride)%next_possinle_slot_count,
					(pole_pitch + slot+1*half_stride)%next_possinle_slot_count,
					(pole_pitch + slot+2*half_stride)%next_possinle_slot_count],
				back: [
					(pole_pitch + slot+2*half_stride)%next_possinle_slot_count,
					(pole_pitch + slot+3*half_stride)%next_possinle_slot_count,
					(pole_pitch + slot+4*half_stride)%next_possinle_slot_count - last]});

			result['C'].push({
				front: [
					(2*pole_pitch + slot+0*half_stride)%next_possinle_slot_count,
					(2*pole_pitch + slot+1*half_stride)%next_possinle_slot_count,
					(2*pole_pitch + slot+2*half_stride)%next_possinle_slot_count],
				back: [
					(2*pole_pitch + slot+2*half_stride)%next_possinle_slot_count,
					(2*pole_pitch + slot+3*half_stride)%next_possinle_slot_count,
					(2*pole_pitch + slot+4*half_stride)%next_possinle_slot_count - last]});
		}
	}

	return result;
}

function get_radio_value(name)
{
	var result;
	document.getElementsByName(name).forEach(
		function (element){
			if(element.checked)
			{
				result = element.value;
				return;
			}
		});

	return result
}

function make_winding_point(arc_step_size, arc_steps, radius)
{
	return {
		x: radius * Math.cos(arc_steps*arc_step_size),
		y: radius * Math.sin(arc_steps*arc_step_size)};
}

function generate_pattern(input)
{
	var result = {
		...input,
		modulus: 0,
		copper_thickness: 0.0347,
		lines: [],
		arcs: [],
		pads: [],
		vias: []};

	const winding_table = make_winding_table(result);

	generate_loop("A", winding_table, result);
	generate_loop("B", winding_table, result);
	generate_loop("C", winding_table, result);

	return result;
}

function generate_loop(strand, winding_table, result)
{
	const radius = result.inner_diameter/2;

	const slot_step_size_rad_inner = 2*Math.PI/(winding_table.slot_clount);
	const slot_step_size_rad_outer = 2*Math.PI/(winding_table.slot_clount + 1);

	for(var i = 0; i < winding_table[strand].length; ++i)
	{
		const layer_front = "Winding" + strand + ".Front";
		const layer_back = "Winding" + strand + ".Back";

		const radius1 = radius + result.magnet_width + result.outer_distance;
		const radius2 = radius + result.magnet_width;
		const radius3 = radius;
		const radius4 = radius - result.inner_distance;

		const point11 = make_winding_point(slot_step_size_rad_outer, winding_table[strand][i].front[0], radius1);
		const point12 = make_winding_point(slot_step_size_rad_inner, winding_table[strand][i].front[1], radius2);
		const point13 = make_winding_point(slot_step_size_rad_inner, winding_table[strand][i].front[1], radius3);
		const point14 = make_winding_point(slot_step_size_rad_inner, winding_table[strand][i].front[2], radius4);

		if(i!=0)
		{
			result.vias.push(point11);
		}
		else
		{
			result.pads.push({start: point11, end: point11});
		}

		result.vias.push(point14);

		result.lines.push(make_line(point11.x, point11.y, point12.x, point12.y, layer_front));
		result.lines.push(make_line(point12.x, point12.y, point13.x, point13.y, layer_front));
		result.lines.push(make_line(point13.x, point13.y, point14.x, point14.y, layer_front));


		const point21 = make_winding_point(slot_step_size_rad_inner, winding_table[strand][i].back[0], radius4);
		const point22 = make_winding_point(slot_step_size_rad_inner, winding_table[strand][i].back[1], radius3);
		const point23 = make_winding_point(slot_step_size_rad_inner, winding_table[strand][i].back[1], radius2);
		const point24 = make_winding_point(slot_step_size_rad_outer, winding_table[strand][i].back[2], radius1);

		result.lines.push(make_line(point21.x, point21.y, point22.x, point22.y, layer_back));
		result.lines.push(make_line(point22.x, point22.y, point23.x, point23.y, layer_back));
		result.lines.push(make_line(point23.x, point23.y, point24.x, point24.y, layer_back));
	}
}
// function mirror(input)
// {
// 	if(input.mirror_h)
// 	{
// 		const h_line = input.height;

// 		for(var i = 0; i < input.lines.length; ++i)
// 		{
// 			input.lines[i].p1.y = h_line - input.lines[i].p1.y;
// 			input.lines[i].p2.y = h_line - input.lines[i].p2.y;
// 		}

// 		for(var i = 0; i < input.arcs.length; ++i)
// 		{
// 			input.arcs[i].c.y = h_line - input.arcs[i].c.y;
// 			input.arcs[i].start.y = h_line - input.arcs[i].start.y;
// 			input.arcs[i].end.y = h_line - input.arcs[i].end.y;
// 		}

// 		for(var i = 0; i < input.pads.length; ++i)
// 		{
// 			input.pads[i].start.y = h_line - input.pads[i].start.y;
// 			input.pads[i].end.y = h_line - input.pads[i].end.y;
// 		}
// 	}

// 	if(input.mirror_v)
// 	{
// 		const v_line = input.width;

// 		for(var i = 0; i < input.lines.length; ++i)
// 		{
// 			input.lines[i].p1.x = v_line - input.lines[i].p1.x;
// 			input.lines[i].p2.x = v_line - input.lines[i].p2.x;
// 		}

// 		for(var i = 0; i < input.arcs.length; ++i)
// 		{
// 			input.arcs[i].c.x = v_line - input.arcs[i].c.x;
// 			input.arcs[i].start.x = v_line - input.arcs[i].start.x;
// 			input.arcs[i].end.x = v_line - input.arcs[i].end.x;
// 		}

// 		for(var i = 0; i < input.pads.length; ++i)
// 		{
// 			input.pads[i].start.x = v_line - input.pads[i].start.x;
// 			input.pads[i].end.x = v_line - input.pads[i].end.x;
// 		}
// 	}

// 	if(( input.mirror_h || input.mirror_v ) && !( input.mirror_h && input.mirror_v ))
// 	{
// 		for(var i = 0; i < input.arcs.length; ++i)
// 		{
// 			const tmp = input.arcs[i].start;

// 			input.arcs[i].start = input.arcs[i].end;
// 			input.arcs[i].end = tmp;
// 		}
// 	}

// 	return input;
// }


// function adjust_line_count_sheer(parity, line_count)
// {
// 	if(parity == "even")
// 	{
// 		if((line_count % 2) != 0)
// 		{
// 			return line_count - 1;
// 		}
// 	}
// 	else if(parity == "odd")
// 	{
// 		if((line_count % 2) == 0)
// 		{
// 			return line_count - 1;
// 		}
// 	}

// 	return line_count;
// }

// function generate_sheer(result)
// {
// 	const width = result.width;
// 	const height = result.height;
// 	const gap = result.gap;
// 	const line_width = result.line_width;
// 	const arc_double = result.arc_double;
// 	const parity = result.parity;
// 	const sqrt2 = Math.sqrt(2);

// 	const step_width = line_width + gap;
// 	const displacement = step_width / sqrt2;
// 	const tmp = width / Math.cos(Math.PI / 4);
// 	const displacement45 = Math.sqrt(tmp * tmp - width * width);

// 	const line_count =
// 		adjust_line_count_sheer(
// 			parity,
// 			Math.floor((result.height - displacement45) / (step_width * sqrt2)));


// 	const stride = (result.height - displacement45) / line_count;
// 	console.log("line_count:", line_count, "stride:", stride);

// 	const adjusted_step_width = stride * sqrt2;
// 	const acr_displacement_x = stride/(2*sqrt2);

// 	var x1 = acr_displacement_x;
// 	var y1 = height - acr_displacement_x;
// 	var x2 = width - acr_displacement_x;

// 	var count = 0;
// 	for(var y = y1; (y - displacement45) > 0; y = y - stride)
// 	{
// 		if(count == 0)
// 		{
// 			result.pads.push({start: {x: x1, y: y}, end: {x: x2, y: y - displacement45 + 2 * acr_displacement_x}});
// 		}

// 		if(count == line_count-1)
// 		{
// 			if(result.parity == "odd")
// 			{
// 				result.pads.push(
// 					{start: {x: x2, y: y - displacement45 + 2 * acr_displacement_x},
// 					 end:   {x: x1, y: y}});
// 			}
// 			else
// 			{
// 				result.pads.push(
// 					{start: {x: x1 + displacement, y: y - displacement},
// 					 end:   {x: x2 - displacement, y: y - displacement45 + displacement + 2 * acr_displacement_x}});
// 			}
// 		}

// 		if(count % 2 == 0)
// 		{
// 			if(count != 0 && count != line_count-1)
// 			{
// 				result.lines.push(
// 					make_line(
// 						x1,
// 						y,
// 						x2,
// 						y - displacement45 + 2 * acr_displacement_x));
// 			}

// 			if(count < line_count-1)
// 			{
// 				for(var j = 0; j<arc_double; ++j)
// 				{
// 					const shift = j * line_width/sqrt2;
// 					result.arcs.push(
// 						make_arc(
// 							x2 - shift,
// 							y - displacement45+2*acr_displacement_x + shift,
// 							x2-displacement - shift,
// 							y - displacement45 + displacement- stride + 2*acr_displacement_x +shift));
// 				}
// 			}

// 		}
// 		else
// 		{
// 			if(count != 0 && count != line_count-1)
// 			{
// 				result.lines.push(
// 				make_line(
// 					x1 + displacement,
// 					y - displacement,
// 					x2 - displacement,
// 					y - displacement45 + displacement + 2 * acr_displacement_x));
// 			}

// 			if(count == line_count-1)
// 			{
// 				console.log("last");
// 			}

// 			if(count < line_count-1)
// 			{
// 				for(var j = 0; j<arc_double; ++j)
// 				{
// 					const shift = j * line_width/sqrt2;
// 					result.arcs.push(
// 						make_arc(
// 							x1 + shift,
// 							y - stride -shift,
// 							x1 + displacement + shift,
// 							y - displacement - shift));
// 				}
// 			}
// 		}
// 		count++;
// 	}

// 	return result;
// }

// function adjust_line_count(parity, line_count)
// {
// 	if(parity == "odd")
// 	{
// 		if((line_count % 2) != 0)
// 		{
// 			return line_count - 1;
// 		}
// 	}
// 	else if(parity == "even")
// 	{
// 		if((line_count % 2) == 0)
// 		{
// 			return line_count - 1;
// 		}
// 	}

// 	return line_count;
// }



// function generate_linear(result)
// {
// 	const width = result.width;
// 	const height = result.height;
// 	const gap = result.gap;
// 	const line_width = result.line_width;
// 	const arc_double = result.arc_double;
// 	const parity = result.parity;

// 	var line_count = adjust_line_count(
// 		parity,
// 		Math.floor((width-line_width) / (line_width + gap)));

// 	const stride = (width-line_width) / line_count;

// 	var counter = 0;
// 	for(var x=line_width/2; x <= width; x = x + stride)
// 	{

// 		const x1 = x;
// 		const x2 = x1 + stride;
// 		const y1 = stride/2 + line_width/2;
// 		const y2 = height - stride/2 - line_width/2;

// 		if(counter == 0)
// 		{
// 			result.pads.push({start: {x: x1, y: y1}, end: {x: x1, y: y2}});
// 		}
// 		else if(line_count == counter)
// 		{
// 			if(result.parity == "odd")
// 			{
// 				result.pads.push({start: {x: x1, y: y2}, end: {x: x1, y: y1}});
// 			}
// 			else
// 			{
// 				result.pads.push({start: {x: x1, y: y1}, end: {x: x1, y: y2}});
// 			}
// 		}
// 		else
// 		{
// 			result.lines.push( make_line(x1, y1, x1, y2));
// 		}

// 		if(counter%2)
// 		{
// 			if(x < width - line_width - gap)
// 			{
// 				for(var j = 0; j<arc_double; ++j)
// 				{
// 					const y = y1+(j*line_width);
// 					result.arcs.push(make_arc(x2, y, x1,  y));
// 				}
// 			}
// 		}
// 		else
// 		{
// 			if(x < width - line_width - gap)
// 			{
// 				for(var j = 0; j<arc_double; ++j)
// 				{
// 					const y = y2-(j*line_width);
// 					result.arcs.push(make_arc(x1, y, x2, y));
// 				}
// 			}
// 		}
// 		counter++;
// 	}

// 	return result;
// }


function midpoint(p1, p2)
{
	return {
		x: (p1.x + p2.x)/2,
		y: (p1.y + p2.y)/2
	}
}

function arc_midpoint(arc)
{
	//console.log("--------------- calc midpoint of:", arc);
//Vector AB
// AB = B - A   (AB.x = B.x - A.x, similar for Y)
	const AB = subtract(arc.end, arc.start);

// It's length
// lAB = sqrt(AB.x*AB.x + AB.y*AB.y)
	const lAB = distance(AB, {x:0,y:0});

// Normalized vector
// uAB = AB / lAB
	uAB = divide(AB, lAB);

// Middle point of chord
// mAB = (A + B)/2
	const mAB = divide(sum(arc.end, arc.start), 2);

// Arrow value
// F = R - sqrt(R*R - lAB*lAB/4)
	const R = distance(arc.c, arc.start);
	const F = R; //- Math.sqrt(R*R - lAB*lAB/4);

	// console.log("mAB:", mAB, "\n uAB:", uAB, "\n F:", F, "\n R: ", R, "\n lAB: ", lAB, "\n Math.sqrt(R*R - lAB*lAB/4): ",Math.sqrt(R*R - lAB*lAB/4));
// Now middle of arc:
// M.x = mAB.x - uAB.Y * F
// M.y = mAB.y + uAB.X * F
	return {
		x: (mAB.x + uAB.y * F),
		y: (mAB.y - uAB.x * F)};
}

function distance(p1, p2)
{
	const x = p1.x - p2.x;
	const y = p1.y - p2.y;
	return Math.sqrt(x*x + y*y);
}

function subtract(p1, p2)
{
	return {
		x: p2.x - p1.x,
		y: p2.y - p1.y
	};
}

function divide(p1, val)
{
	return {x: p1.x/val, y: p1.y/val};
}

function sum(p1, p2)
{
	return {x: p1.x+p2.x, y: p1.y+p2.y};
}

function make_arc(x1, y1, x2, y2)
{
	const p1 = {x: x1, y: y1};
	const p2 = {x: x2, y: y2};
	return {c: midpoint(p1, p2), start: p1, end: p2};
}


function arc_from_points(p1, p2)
{
	return {c: midpoint(p1, p2), start: p1, end: p2};
}

function make_line(x1,y1, x2,y2, layer)
{
	return {
		p1: {x: x1, y: y1},
		p2: {x: x2, y: y2},
		layer: layer};
}

function make_footprint(input)
{
	const output = document.getElementById("output");
	const name = input.name;
	const version = "20220621";
	const generator = "foojs";
	const lines = print_lines(input.lines, input.line_width, input.layer);
	const arcs = print_arcs(input.arcs, input.line_width, input.layer);
	const pads = print_pads(
		input.pads,
		input.line_width,
		input.layer,
		input.pad_offset);

	const data =
		`(footprint \"${name}\"` +
			` (version ${version})` +
			` (generator ${generator})\n` +
			// `\t(layer \"${input.layer}\")\n` +
			`\t(attr smd exclude_from_pos_files exclude_from_bom)\n` +
			`\t${print_reference()}\n` +
			`\t${print_value()}\n` +
			`${lines}\n` +
			`${arcs}\n` +
			`${pads}\n)`;
 	output.innerHTML = data;
}

function print_reference()
{
	const result =
		`(fp_text ` +
			`reference ` +
			`\"Ref**\" ` +
			`(at 0 0) ` +
			`(layer \"User.1\") ` +
			`hide ` +
			`(effects (font (size 1.27 1.27) (thickness 0.15))) ` +
			`(tstamp 2b5aef14-1a9b-42d9-af96-06383f70d306))`;
	return result;
}

function print_value()
{
	const result =
		`(fp_text ` +
			`value ` +
			`\"Val**\" ` +
			`(at 0 0) ` +
			`(layer \"User.1\") ` +
			`hide ` +
			`(effects (font (size 1.27 1.27) (thickness 0.15))) ` +
			`(tstamp c0e73684-e1fa-4bb2-b31b-ca2b1ffaa45c))`;
	return result;
}

function print_lines(lines, line_width, layer)
{
	var result = "";
	for(var i = 0; i < lines.length; ++i)
	{
		result +=
			`\t(fp_line ` +
				`(start ${lines[i].p1.x} ${lines[i].p1.y}) ` +
				`(end ${lines[i].p2.x} ${lines[i].p2.y}) ` +
				`(stroke (width ${line_width}) (type default)) ` +
				`(layer \"${layer}\") ` +
				`(tstamp ${crypto.randomUUID()}))\n`;
	}
	return result;
}

function print_arcs(arcs, line_width, layer)
{
	var result = "";
	for(var i = 0; i < arcs.length; ++i)
	{
		const mid = arc_midpoint(arcs[i]);
		result +=
			`\t(fp_arc ` +
				`(start ${arcs[i].end.x} ${arcs[i].end.y}) ` +
				`(mid ${mid.x} ${mid.y}) ` +
				`(end ${arcs[i].start.x} ${arcs[i].start.y}) ` +
				`(stroke (width ${line_width}) (type default)) ` +
				`(layer \"${layer}\") ` +
				`(tstamp ${crypto.randomUUID()}))\n`;
	}
	return result;
}

function print_pads(pads, line_width, layer, pad_offset)
{
	var result = "";
	for(var i = 0; i < pads.length; ++i)
	{
		const pad = pads[i];

		result +=
			`\t(pad ` +
				`\"${i+1+pad_offset}\" ` +
				`connect custom ` +
				`(at ${pad.start.x} ${pad.start.y}) ` +
				`(size ${line_width} ${line_width}) ` +
				`(layers \"${layer}\") ` +
				`(clearance ${line_width}) (thermal_bridge_angle 45) ` +
    			`(options (clearance outline) (anchor circle)) ` +
    			`(primitives ` +
    				`(gr_line ` +
    				`(start 0 0) ` +
    				`(end ${pad.end.x - pad.start.x} ${pad.end.y - pad.start.y}) ` +
    				`(width ${line_width})))` +
				`(tstamp ${crypto.randomUUID()}))\n`;
	}
	return result;
}

function save_generated()
{
	var name = document.getElementById("name").value;

	const tempLink = document.createElement("a");
	const taBlob = new Blob(
		[document.getElementById("output").innerHTML],
		{type: 'text/plain'});

	tempLink.setAttribute('href', URL.createObjectURL(taBlob));
	tempLink.setAttribute('download', `${name}.kicad_mod`);
	tempLink.click();

	URL.revokeObjectURL(tempLink.href);
}
