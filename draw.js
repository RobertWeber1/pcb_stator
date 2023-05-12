

function draw_pattern(input)
{
	var canvas = document.getElementById("canvas");
	var ctx = canvas.getContext("2d");
	const transtormation = ctx.getTransform();
	const lineWidth = ctx.lineWidth;
	const strokeStyle = ctx.strokeStyle;
	const lineCap = ctx.lineCap;

	const zoom = document.getElementById("zoom").valueAsNumber;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.translate(canvas.width/2,canvas.height/2);

	ctx.scale(zoom, zoom);

	// ctx.beginPath();
	// ctx.rect(0, 0, input.width, input.height);
	// ctx.stroke();

	ctx.lineWidth = input.track_width;
	ctx.strokeStyle = 'darkred';
	ctx.lineCap = "round";

	for(var i=0; i<input.lines.length; ++i)
	{
		draw_line(ctx, input.lines[i]);
	}

	for(var i=0; i<input.arcs.length; ++i)
	{
		draw_arc(ctx, input.arcs[i]);
	}

	for(var i=0; i<input.pads.length; ++i)
	{
		draw_pad(ctx, input.pads[i], input.line_width, i+1);
	}

	for(var i=0; i<input.vias.length; ++i)
	{
		draw_via(ctx, input.vias[i], input.line_width);
	}

	ctx.setTransform(transtormation);
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = strokeStyle;
	ctx.lineCap = lineCap;
}

function draw_rect(ctx, x, y, w, h)
{
	ctx.beginPath();
	ctx.rect(x, y, w, h);
	ctx.stroke();
}

function draw_line(ctx, input)
{
	ctx.beginPath();
	if(input.layer == "F.Cu")
		ctx.strokeStyle = 'darkred';
	else if(input.layer == "B.Cu")
		ctx.strokeStyle = 'darkgreen';

	else if (input.layer == "WindingA.Front")
	{
		ctx.strokeStyle = 'darkred';
		ctx.lineWidth = 0.1;
	}
	else if (input.layer == "WindingA.Back")
	{
		ctx.strokeStyle = '#ff00007f';
		ctx.lineWidth = 0.5;
	}
	else if (input.layer == "WindingB.Front")
	{
		ctx.strokeStyle = 'darkBlue';
		ctx.lineWidth = 0.1;
	}
	else if (input.layer == "WindingB.Back")
	{
		ctx.strokeStyle = '#0000ff7f';
		ctx.lineWidth = 0.5;
	}

	else if (input.layer == "WindingC.Front")
	{
		ctx.strokeStyle = 'darkgreen';
		ctx.lineWidth = 0.1;
	}
	else if (input.layer == "WindingC.Back")
	{
		ctx.strokeStyle = '#0080007f';
		// console.log("ctx.strokeStyle: ", ctx.strokeStyle);
		ctx.lineWidth = 0.5;
	}
	else
		ctx.strokeStyle = 'darkgray';
	ctx.moveTo(input.p1.x, input.p1.y);
	ctx.lineTo(input.p2.x, input.p2.y);
	ctx.stroke();
}

function draw_via(ctx, via, line_width)
{
	ctx.beginPath();
	ctx.strokeStyle = '#000000ff';
	ctx.lineWidth = line_width;
	ctx.moveTo(via.x, via.y);
	ctx.lineTo(via.x, via.y);
	ctx.stroke();
}

function draw_arc(ctx, input)
{
	const c = input.c;
	const start_p = input.start;
	const end_p = input.end;

	const r = distance(c, start_p);
	const d = r * 2;
	const m1 = subtract(c, start_p);
	const m2 = subtract(c, end_p);
	const start_phi = Math.atan(m1.y/m1.x) + (m1.x<0?Math.PI:0);
	const end_phi = Math.atan(m2.y/m2.x)+ (m2.x<0?Math.PI:0);

	ctx.beginPath();
	ctx.arc(c.x, c.y, r, end_phi, start_phi);
	ctx.stroke();
}

function draw_pad(ctx, input, line_width, number)
{
	const radius = line_width/2;

	if(number%2 == 1)
	{
		console.log();
		ctx.strokeStyle = 'lightgreen';
		ctx.fillStyle = "green";
	}
	else
	{
		ctx.strokeStyle = 'lightblue';
		ctx.fillStyle = "blue";
	}

	ctx.beginPath();
	ctx.lineCap = "round";
	ctx.moveTo(input.start.x, input.start.y);
	ctx.lineTo(input.end.x, input.end.y);
	ctx.stroke();

	ctx.beginPath();
	const point_x = input.start.x;
    const point_y = input.start.y;
	ctx.arc(point_x, point_y, radius, 0 , 2 * Math.PI);
	ctx.fill();
}
